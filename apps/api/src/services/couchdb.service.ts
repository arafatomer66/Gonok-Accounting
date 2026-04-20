import * as crypto from 'crypto';
import { env } from '../config/env';

function getCouch() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nano = require('nano');
  return nano(`http://${env.COUCHDB_USERNAME}:${env.COUCHDB_PASSWORD}@${new URL(env.COUCHDB_URL).host}`);
}

export class CouchDbService {
  /**
   * Provision a per-user CouchDB database: gonok-{userUuid}
   */
  async provisionUserDatabase(userUuid: string): Promise<string> {
    const couch = getCouch();
    const dbName = `gonok-${userUuid}`;

    try {
      await couch.db.create(dbName);
      console.log(`[CouchDB] Created database: ${dbName}`);
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      if (error.statusCode === 412) {
        console.log(`[CouchDB] Database already exists: ${dbName}`);
      } else {
        throw err;
      }
    }

    await this.ensureCouchDbUser(couch, userUuid, dbName);
    return dbName;
  }

  /**
   * Create or update a CouchDB user with access to their database.
   */
  private async ensureCouchDbUser(couch: any, userUuid: string, dbName: string): Promise<void> {
    const usersDb = couch.use('_users');
    const userId = `org.couchdb.user:gonok-${userUuid}`;
    const password = this.generatePassword(userUuid);

    try {
      const existing = await usersDb.get(userId);
      await usersDb.insert({ ...existing, password });
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      if (error.statusCode === 404) {
        await usersDb.insert({
          _id: userId,
          name: `gonok-${userUuid}`,
          password,
          roles: [],
          type: 'user',
        });
      } else {
        throw err;
      }
    }

    // Set security — only this user can access their database
    const db = couch.use(dbName);
    await db.insert(
      {
        admins: { names: [], roles: ['_admin'] },
        members: { names: [`gonok-${userUuid}`], roles: [] },
      },
      '_security',
    );

    console.log(`[CouchDB] User gonok-${userUuid} configured for ${dbName}`);
  }

  /**
   * Get sync credentials for a user.
   */
  getSyncCredentials(userUuid: string): {
    url: string;
    username: string;
    password: string;
    database: string;
  } {
    const dbName = `gonok-${userUuid}`;
    return {
      url: `${env.COUCHDB_PUBLIC_URL || env.COUCHDB_URL}/${dbName}`,
      username: `gonok-${userUuid}`,
      password: this.generatePassword(userUuid),
      database: dbName,
    };
  }

  private generatePassword(userUuid: string): string {
    return crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(userUuid)
      .digest('hex')
      .substring(0, 32);
  }
}
