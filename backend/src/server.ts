import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { pool } from './db/pool';
import authRoutes from './routes/auth';
import cnpjRoutes from './routes/cnpj';
import usersRoutes from './routes/users';
import credentialsRoutes from './routes/credentials';
import ingestionRoutes from './routes/ingestion';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', cnpjRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/credentials', credentialsRoutes);
app.use('/api/v1/ingestion', ingestionRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 CNPJ Data API running on port ${PORT}`);
});

export default app;
