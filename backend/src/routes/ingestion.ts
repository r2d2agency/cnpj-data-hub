import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { jwtAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(jwtAuth);
router.use(requireRole('admin'));

// POST /api/v1/ingestion/start-from-link
router.post('/start-from-link', async (req: AuthRequest, res: Response) => {
  const { url, month } = req.body;

  try {
    // The file types to process
    const fileTypes = [
      'empresas', 'estabelecimentos', 'socios',
      'municipios', 'naturezas', 'qualificacoes', 'paises', 'cnaes',
    ];

    const jobs = [];
    for (const fileType of fileTypes) {
      const result = await pool.query(
        `INSERT INTO ingestion_jobs (source, url, file_type, status)
         VALUES ('link', $1, $2, 'pending') RETURNING *`,
        [`${url}/${fileType}`, fileType]
      );
      jobs.push(result.rows[0]);
    }

    // In a real implementation, trigger background processing here
    // using a job queue like Bull, pg-boss, or similar

    res.status(201).json({ message: 'Ingestion started', jobs });
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
