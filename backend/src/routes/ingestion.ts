import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { jwtAuth, requireRole, AuthRequest } from '../middleware/auth';
import { processJob } from '../workers/ingestion-worker';

const router = Router();
router.use(jwtAuth);
router.use(requireRole('admin'));

// POST /api/v1/ingestion/start-from-link
router.post('/start-from-link', async (req: AuthRequest, res: Response) => {
  const { url, month } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // The file types to process (order matters: reference tables first)
    const fileTypes = [
      'municipios', 'paises', 'naturezas', 'qualificacoes', 'cnaes',
      'empresas', 'estabelecimentos', 'socios',
    ];

    // Normalize: remove trailing slash
    const baseUrl = url.replace(/\/+$/, '');

    const jobs = [];
    for (const fileType of fileTypes) {
      const result = await pool.query(
        `INSERT INTO ingestion_jobs (source, url, file_type, status)
         VALUES ('link', $1, $2, 'pending') RETURNING *`,
        [baseUrl, fileType]
      );
      jobs.push(result.rows[0]);
    }

    // Start processing in background (non-blocking)
    // Process reference tables first, then main tables
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

    res.status(201).json({ message: 'Ingestão iniciada', jobs });
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

// DELETE /api/v1/ingestion/jobs — clear all or by status
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

export default router;
