import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db/pool';
import { jwtAuth, requireRole, AuthRequest } from '../middleware/auth';
import { processJob, processUploadedZip } from '../workers/ingestion-worker';

const router = Router();
router.use(jwtAuth);
router.use(requireRole('admin'));

// Multer config — save to /tmp/ingestion-uploads
const uploadDir = path.join('/tmp', 'ingestion-uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, uploadDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .zip são aceitos'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB
});

// POST /api/v1/ingestion/upload — manual ZIP upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  const { file_type } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'Arquivo ZIP é obrigatório' });
  }

  const validTypes = ['municipios', 'paises', 'naturezas', 'qualificacoes', 'cnaes', 'empresas', 'estabelecimentos', 'socios'];
  if (!file_type || !validTypes.includes(file_type)) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: `Tipo inválido. Valores aceitos: ${validTypes.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ingestion_jobs (source, file_name, file_type, status)
       VALUES ('upload', $1, $2, 'pending') RETURNING *`,
      [file.originalname, file_type]
    );
    const job = result.rows[0];

    (async () => {
      try {
        await processUploadedZip(job.id, file_type, file.path);
      } catch (err) {
        console.error(`Upload job ${job.id} failed:`, err);
      } finally {
        fs.unlink(file.path, () => {});
      }
    })();

    res.status(201).json({ message: 'Upload recebido, processamento iniciado', job });
  } catch (error) {
    fs.unlink(file.path, () => {});
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Falha ao iniciar processamento do upload' });
  }
});

// POST /api/v1/ingestion/start-from-link
router.post('/start-from-link', async (req: AuthRequest, res: Response) => {
  const { url, month, skip_completed } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const fileTypes = [
      'municipios', 'paises', 'naturezas', 'qualificacoes', 'cnaes',
      'empresas', 'estabelecimentos', 'socios',
    ];

    let typesToProcess = fileTypes;
    if (skip_completed !== false) {
      const completed = await pool.query(
        `SELECT DISTINCT file_type FROM ingestion_jobs WHERE status = 'completed'`
      );
      const completedTypes = new Set(completed.rows.map((r: any) => r.file_type));
      typesToProcess = fileTypes.filter(ft => !completedTypes.has(ft));

      if (typesToProcess.length === 0) {
        return res.json({ message: 'Todos os tipos já foram processados com sucesso', jobs: [], skipped: fileTypes });
      }
    }

    const baseUrl = url.replace(/\/+$/, '');
    const skipped = fileTypes.filter(ft => !typesToProcess.includes(ft));

    const jobs = [];
    for (const fileType of typesToProcess) {
      const result = await pool.query(
        `INSERT INTO ingestion_jobs (source, url, file_type, status)
         VALUES ('link', $1, $2, 'pending') RETURNING *`,
        [baseUrl, fileType]
      );
      jobs.push(result.rows[0]);
    }

    (async () => {
      for (const job of jobs) {
        try {
          await processJob(job.id, job.file_type, job.url);
        } catch (err) {
          console.error(`Job ${job.id} (${job.file_type}) failed:`, err);
        }
      }
      console.log('🏁 All ingestion jobs finished');
    })();

    res.status(201).json({
      message: `Ingestão iniciada para ${typesToProcess.length} tipo(s)`,
      jobs,
      skipped,
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: 'Failed to start ingestion' });
  }
});

// GET /api/v1/ingestion/jobs
router.get('/jobs', async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT 50'
  );
  res.json({ data: result.rows });
});

// DELETE /api/v1/ingestion/jobs
router.delete('/jobs', async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  try {
    let result;
    if (status) {
      result = await pool.query('DELETE FROM ingestion_jobs WHERE status = $1', [status]);
    } else {
      result = await pool.query('DELETE FROM ingestion_jobs');
    }
    res.json({ message: `${result.rowCount} job(s) removido(s)` });
  } catch (error) {
    console.error('Delete jobs error:', error);
    res.status(500).json({ error: 'Failed to delete jobs' });
  }
});

// GET /api/v1/ingestion/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM empresas) as total_empresas,
      (SELECT COUNT(*) FROM estabelecimentos) as total_estabelecimentos,
      (SELECT COUNT(*) FROM socios) as total_socios,
      (SELECT COUNT(*) FROM municipios) as total_municipios,
      (SELECT COUNT(*) FROM cnaes) as total_cnaes
  `);
  res.json(stats.rows[0]);
});

// GET /api/v1/ingestion/logs
router.get('/logs', async (req: AuthRequest, res: Response) => {
  const { job_id, level, limit: lim } = req.query;
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (job_id) {
    conditions.push(`l.job_id = $${idx}`);
    values.push(job_id);
    idx++;
  }
  if (level) {
    conditions.push(`l.level = $${idx}`);
    values.push(level);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitVal = Math.min(Number(lim) || 200, 1000);

  const result = await pool.query(
    `SELECT l.*, j.file_type, j.status as job_status
     FROM ingestion_logs l
     LEFT JOIN ingestion_jobs j ON j.id = l.job_id
     ${where}
     ORDER BY l.created_at DESC
     LIMIT ${limitVal}`,
    values
  );
  res.json({ data: result.rows });
});

// DELETE /api/v1/ingestion/logs
router.delete('/logs', async (req: AuthRequest, res: Response) => {
  const { job_id } = req.query;
  try {
    let result;
    if (job_id) {
      result = await pool.query('DELETE FROM ingestion_logs WHERE job_id = $1', [job_id]);
    } else {
      result = await pool.query('DELETE FROM ingestion_logs');
    }
    res.json({ message: `${result.rowCount} log(s) removido(s)` });
  } catch (error) {
    console.error('Delete logs error:', error);
    res.status(500).json({ error: 'Failed to delete logs' });
  }
});

export default router;
