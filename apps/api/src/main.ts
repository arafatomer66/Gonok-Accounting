import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { AppDataSource } from './config/database.config';
import apiRoutes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { sanitizeInput } from './middleware/sanitize.middleware';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", env.COUCHDB_PUBLIC_URL || 'http://localhost:5984'].filter(Boolean),
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS — restrict to known origins in production
const allowedOrigins = env.NODE_ENV === 'production'
  ? [
      `https://${env.DOMAIN}`,
      `https://${env.DOMAIN}/shop`,
    ].filter(Boolean)
  : undefined; // allow all in dev

app.use(cors({
  origin: allowedOrigins || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser with size limit
app.use(express.json({ limit: '1mb' }));

// Sanitize all incoming request body/query to prevent XSS
app.use(sanitizeInput);

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
