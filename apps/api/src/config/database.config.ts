import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Business } from '../entities/business.entity';
import { BusinessUser } from '../entities/business-user.entity';

const isDev = (process.env.NODE_ENV || 'development') === 'development';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'gonok',
  password: process.env.DB_PASSWORD || 'gonok',
  database: process.env.DB_NAME || 'gonok',
  synchronize: isDev || process.env.DB_SYNC === 'true',
  logging: isDev,
  entities: [User, Business, BusinessUser],
});
