import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { jwtAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(jwtAuth);
router.use(requireRole('admin'));

// GET /api/v1/users
router.get('/', async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT id, name, email, role, status, max_concurrent_queries, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ data: result.rows });
});

// POST /api/v1/users
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, max_concurrent_queries } = req.body;

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, max_concurrent_queries)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status, created_at`,
      [name, email, hash, role || 'user', max_concurrent_queries || 5]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/v1/users/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name, email, role, status, max_concurrent_queries } = req.body;

  const result = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email),
     role = COALESCE($3, role), status = COALESCE($4, status),
     max_concurrent_queries = COALESCE($5, max_concurrent_queries), updated_at = NOW()
     WHERE id = $6 RETURNING id, name, email, role, status, max_concurrent_queries`,
    [name, email, role, status, max_concurrent_queries, req.params.id]
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

// PUT /api/v1/users/:id/password
router.put('/:id/password', async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [hash, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

export default router;
