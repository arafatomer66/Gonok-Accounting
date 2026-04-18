import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { BusinessUser } from './business-user.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ length: 100, default: '' })
  first_name: string;

  @Column({ length: 100, default: '' })
  last_name: string;

  @Column({ length: 200, default: '' })
  name: string;

  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({ nullable: true, length: 6 })
  otp: string;

  @Column({ type: 'bigint', nullable: true })
  otp_expires_at: number;

  @Column({ nullable: true })
  refresh_token: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => BusinessUser, (bu) => bu.user)
  business_users: BusinessUser[];
}
