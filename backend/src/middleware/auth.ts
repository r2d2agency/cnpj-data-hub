import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  credentialId?: string;
}

// JWT auth for admin panel
export function jwtAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// API key auth for external systems
export async function apiKeyAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  try {
    const result = await pool.query(
      `SELECT c.id, c.user_id, c.permissions, c.rate_limit, c.status, u.max_concurrent_queries
       FROM api_credentials c JOIN users u ON c.user_id = u.id
       WHERE c.api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid API key' });

    const cred = result.rows[0];
    if (cred.status !== 'active') return res.status(403).json({ error: 'API key revoked' });

    req.credentialId = cred.id;
    req.userId = cred.user_id;

    // Update last used
    await pool.query('UPDATE api_credentials SET last_used_at = NOW() WHERE id = $1', [cred.id]);

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
