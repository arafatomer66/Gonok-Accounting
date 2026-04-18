import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { BusinessUser } from './business-user.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ length: 200, nullable: true })
  name_en: string;

  @Column({ length: 200, nullable: true })
  name_bn: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 20, nullable: true })
  display_phone: string;

  @Column({ default: '' })
  logo_url: string;

  @Column({ type: 'jsonb', default: {} })
  address: {
    display_address: string | null;
    city: string | null;
    district: string | null;
    country_code: string | null;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => BusinessUser, (bu) => bu.business)
  business_users: BusinessUser[];
}
