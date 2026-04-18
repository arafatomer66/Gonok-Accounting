import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { AppDataSource } from './config/database.config';
import apiRoutes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', apiRoutes);

// Error handler
app.use(errorHandler);

// Start server
async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');
  } catch (err) {
    console.warn('Database not connected (will retry on demand):', (err as Error).message);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`Gonok API listening at http://localhost:${env.PORT}/api/v1`);
  });
  server.on('error', console.error);
}

bootstrap();
