import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1713200000000 implements MigrationInterface {
  name = 'InitialSchema1713200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "first_name" character varying(100) NOT NULL DEFAULT '',
        "last_name" character varying(100) NOT NULL DEFAULT '',
        "name" character varying(200) NOT NULL DEFAULT '',
        "phone" character varying(20) NOT NULL,
        "password_hash" character varying,
        "otp" character varying(6),
        "otp_expires_at" bigint,
        "refresh_token" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_users" PRIMARY KEY ("uuid")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "businesses" (
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name_en" character varying(200),
        "name_bn" character varying(200),
        "phone" character varying(20),
        "display_phone" character varying(20),
        "logo_url" character varying NOT NULL DEFAULT '',
        "address" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_businesses" PRIMARY KEY ("uuid")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "business_users" (
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_uuid" uuid NOT NULL,
        "business_uuid" uuid NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'viewer',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_users" PRIMARY KEY ("uuid"),
        CONSTRAINT "FK_business_users_user" FOREIGN KEY ("user_uuid") REFERENCES "users"("uuid") ON DELETE CASCADE,
        CONSTRAINT "FK_business_users_business" FOREIGN KEY ("business_uuid") REFERENCES "businesses"("uuid") ON DELETE CASCADE,
        CONSTRAINT "UQ_business_users" UNIQUE ("user_uuid", "business_uuid")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "business_users"`);
    await queryRunner.query(`DROP TABLE "businesses"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
