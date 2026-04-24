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

  // AWS S3 + CloudFront (image uploads)
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'gonok-uploads',
  AWS_CLOUDFRONT_DOMAIN: process.env.AWS_CLOUDFRONT_DOMAIN || '',
};
