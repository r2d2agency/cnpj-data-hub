import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { jwtAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/settings - Public settings (no auth needed for site name)
router.get('/', async (_req, res: Response) => {
  try {
    const result = await pool.query('SELECT key, value FROM system_settings');
    const settings: Record<string, string> = {};
    result.rows.forEach((r: any) => { settings[r.key] = r.value; });
    res.json({ data: settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/v1/settings - Update settings (admin only)
router.put('/', jwtAuth, async (req: AuthRequest, res: Response) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings object' });
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      if (typeof key !== 'string' || key.length > 100 || typeof value !== 'string' || value.length > 500) continue;
      await pool.query(
        `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
