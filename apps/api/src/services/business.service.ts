import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Business, BusinessUser } from '../entities';
import { CouchDbService } from './couchdb.service';

export class BusinessService {
  private businessRepo: Repository<Business>;
  private businessUserRepo: Repository<BusinessUser>;
  private couchDb: CouchDbService;

  constructor() {
    this.businessRepo = AppDataSource.getRepository(Business);
    this.businessUserRepo = AppDataSource.getRepository(BusinessUser);
    this.couchDb = new CouchDbService();
  }

  async listForUser(userUuid: string): Promise<Business[]> {
    const memberships = await this.businessUserRepo.find({
      where: { user_uuid: userUuid },
      relations: ['business'],
    });
    return memberships.map((m) => m.business);
  }

  async create(
    userUuid: string,
    data: { name_en?: string; name_bn?: string; phone?: string; address?: Business['address'] },
  ): Promise<Business> {
    const business = this.businessRepo.create({
      name_en: data.name_en,
      name_bn: data.name_bn,
      phone: data.phone,
      display_phone: data.phone,
      address: data.address || { display_address: null, city: null, district: null, country_code: 'BD' },
    });
    const saved = await this.businessRepo.save(business);

    // Make creator the owner
    const membership = this.businessUserRepo.create({
      user_uuid: userUuid,
      business_uuid: saved.uuid,
      role: 'owner',
    });
    await this.businessUserRepo.save(membership);

    // Provision CouchDB database for user
    try {
      await this.couchDb.provisionUserDatabase(userUuid);
    } catch (err) {
      console.warn('[CouchDB] Failed to provision database:', (err as Error).message);
    }

    return saved;
  }

  async getById(bizId: string): Promise<Business | null> {
    return this.businessRepo.findOne({ where: { uuid: bizId } });
  }

  async update(bizId: string, data: Partial<Business>): Promise<Business> {
    await this.businessRepo.update(bizId, data);
    return this.businessRepo.findOneOrFail({ where: { uuid: bizId } });
  }

  async delete(bizId: string): Promise<void> {
    await this.businessRepo.delete(bizId);
  }

  async getUserRole(bizId: string, userUuid: string): Promise<string | null> {
    const membership = await this.businessUserRepo.findOne({
      where: { business_uuid: bizId, user_uuid: userUuid },
    });
    return membership?.role || null;
  }

  async listUsers(bizId: string): Promise<BusinessUser[]> {
    return this.businessUserRepo.find({
      where: { business_uuid: bizId },
      relations: ['user'],
    });
  }

  async inviteUser(bizId: string, userUuid: string, role: string): Promise<BusinessUser> {
    const existing = await this.businessUserRepo.findOne({
      where: { business_uuid: bizId, user_uuid: userUuid },
    });
    if (existing) {
      throw new Error('User already in this business');
    }
    const membership = this.businessUserRepo.create({
      business_uuid: bizId,
      user_uuid: userUuid,
      role,
    });
    return this.businessUserRepo.save(membership);
  }

  async changeRole(bizId: string, userUuid: string, newRole: string): Promise<void> {
    await this.businessUserRepo.update(
      { business_uuid: bizId, user_uuid: userUuid },
      { role: newRole },
    );
  }

  async removeUser(bizId: string, userUuid: string): Promise<void> {
    await this.businessUserRepo.delete({ business_uuid: bizId, user_uuid: userUuid });
  }
}
