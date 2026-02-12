import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { pool } from '../db/pool';
import { jwtAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(jwtAuth);
router.use(requireRole('admin'));

function generateApiKey(): string {
  return `cnpj_live_sk_${crypto.randomBytes(24).toString('hex')}`;
}

// GET /api/v1/credentials
router.get('/', async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT c.*, u.name as user_name FROM api_credentials c
     JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC`
  );
  res.json({ data: result.rows });
});

// POST /api/v1/credentials
router.post('/', async (req: AuthRequest, res: Response) => {
  const { user_id, system_name, permissions, rate_limit } = req.body;
  const apiKey = generateApiKey();

  try {
    const result = await pool.query(
      `INSERT INTO api_credentials (user_id, api_key, system_name, permissions, rate_limit)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, apiKey, system_name, permissions || ['search'], rate_limit || 500]
    );
    res.status(201).json({ ...result.rows[0], api_key: apiKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

// PUT /api/v1/credentials/:id/revoke
router.put('/:id/revoke', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `UPDATE api_credentials SET status = 'revoked' WHERE id = $1 RETURNING id`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Credential not found' });
  res.json({ message: 'Credential revoked' });
});

// PUT /api/v1/credentials/:id/regenerate
router.put('/:id/regenerate', async (req: AuthRequest, res: Response) => {
  const newKey = generateApiKey();
  const result = await pool.query(
    `UPDATE api_credentials SET api_key = $1, status = 'active' WHERE id = $2 RETURNING *`,
    [newKey, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Credential not found' });
  res.json({ ...result.rows[0], api_key: newKey });
});

export default router;
