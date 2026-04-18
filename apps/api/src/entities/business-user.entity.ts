import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Business } from './business.entity';

@Entity('business_users')
export class BusinessUser {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  user_uuid: string;

  @Column()
  business_uuid: string;

  @Column({ length: 20, default: 'viewer' })
  role: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (u) => u.business_users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_uuid' })
  user: User;

  @ManyToOne(() => Business, (b) => b.business_users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_uuid' })
  business: Business;
}
