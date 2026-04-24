import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { User } from '../entities';
import { env } from '../config/env';
import { CouchDbService } from './couchdb.service';

export class AuthService {
  private couchDb: CouchDbService;

  constructor() {
    this.couchDb = new CouchDbService();
  }

  private get userRepo(): Repository<User> {
    return AppDataSource.getRepository(User);
  }

  async register(phone: string, name: string): Promise<{ message: string }> {
    let user = await this.userRepo.findOne({ where: { phone } });
    if (user) {
      throw new Error('Phone number already registered');
    }

    const otp = env.NODE_ENV === 'production' ? this.generateOtp() : '123456';
    user = this.userRepo.create({
      phone,
      name,
      first_name: name,
      otp,
      otp_expires_at: Date.now() + 30 * 60 * 1000, // 30 min (dev)
    });
    await this.userRepo.save(user);

    // TODO: Send OTP via SMS gateway
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    return { message: 'OTP sent' };
  }

  async login(phone: string): Promise<{ message: string }> {
    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      throw new Error('User not found');
    }

    const otp = env.NODE_ENV === 'production' ? this.generateOtp() : '123456';
    user.otp = otp;
    user.otp_expires_at = Date.now() + 30 * 60 * 1000;
    await this.userRepo.save(user);

    // TODO: Send OTP via SMS gateway
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    return { message: 'OTP sent' };
  }

  async verifyOtp(phone: string, otp: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: { uuid: string; name: string; phone: string };
  }> {
    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.otp !== otp || !user.otp_expires_at || user.otp_expires_at < Date.now()) {
      throw new Error('Invalid or expired OTP');
    }

    // Clear OTP
    user.otp = null;
    user.otp_expires_at = null;

    // Generate tokens
    const payload = { uuid: user.uuid, phone: user.phone };
    const access_token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY });
    const refresh_token = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });

    user.refresh_token = await bcrypt.hash(refresh_token, 10);
    await this.userRepo.save(user);

    // Provision CouchDB database for user on first verify
    try {
      await this.couchDb.provisionUserDatabase(user.uuid);
    } catch (err) {
      console.warn('[CouchDB] Failed to provision on verify:', (err as Error).message);
    }

    return {
      access_token,
      refresh_token,
      user: { uuid: user.uuid, name: user.name, phone: user.phone },
    };
  }

  async refreshToken(refresh_token: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    let decoded: { uuid: string; phone: string };
    try {
      decoded = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET) as typeof decoded;
    } catch {
      throw new Error('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({ where: { uuid: decoded.uuid } });
    if (!user || !user.refresh_token) {
      throw new Error('User not found or no active session');
    }

    const isValid = await bcrypt.compare(refresh_token, user.refresh_token);
    if (!isValid) {
      throw new Error('Refresh token mismatch');
    }

    const payload = { uuid: user.uuid, phone: user.phone };
    const new_access_token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY });
    const new_refresh_token = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });

    user.refresh_token = await bcrypt.hash(new_refresh_token, 10);
    await this.userRepo.save(user);

    return { access_token: new_access_token, refresh_token: new_refresh_token };
  }

  async logout(userUuid: string): Promise<void> {
    await this.userRepo.update(userUuid, { refresh_token: null });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
