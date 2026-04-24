import * as dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3333', 10),
  DOMAIN: process.env.DOMAIN || 'localhost',
  JWT_SECRET: process.env.JWT_SECRET || 'gonok-dev-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'gonok-dev-refresh-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '1h',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  COUCHDB_URL: process.env.COUCHDB_URL || 'http://localhost:5984',
  COUCHDB_PUBLIC_URL: process.env.COUCHDB_PUBLIC_URL || '',
  COUCHDB_USERNAME: process.env.COUCHDB_USERNAME || 'admin',
  COUCHDB_PASSWORD: process.env.COUCHDB_PASSWORD || 'password',
};
