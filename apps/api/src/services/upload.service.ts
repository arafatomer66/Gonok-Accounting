import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import * as crypto from 'crypto';
import * as path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export class UploadService {
  private get s3(): S3Client {
    return new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Upload an image to S3 and return the CDN URL.
   * @param file - multer file object
   * @param folder - subfolder in bucket (e.g., 'business-logos', 'products')
   * @returns CDN URL of the uploaded image
   */
  async uploadImage(
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    folder: string,
  ): Promise<string> {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`);
    }

    // Generate unique filename: folder/uuid-timestamp.ext
    const ext = path.extname(file.originalname).toLowerCase() || this.getExtFromMime(file.mimetype);
    const key = `${folder}/${crypto.randomUUID()}-${Date.now()}${ext}`;

    // Upload to S3
    await this.s3.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    // Return CDN URL (CloudFront) or S3 URL fallback
    if (env.AWS_CLOUDFRONT_DOMAIN) {
      return `https://${env.AWS_CLOUDFRONT_DOMAIN}/${key}`;
    }
    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }

  /**
   * Delete an image from S3 by its CDN/S3 URL.
   */
  async deleteImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;

    // Extract key from URL
    let key: string | null = null;
    if (env.AWS_CLOUDFRONT_DOMAIN && imageUrl.includes(env.AWS_CLOUDFRONT_DOMAIN)) {
      key = imageUrl.split(`${env.AWS_CLOUDFRONT_DOMAIN}/`)[1];
    } else if (imageUrl.includes('.s3.')) {
      key = imageUrl.split('.amazonaws.com/')[1];
    }

    if (!key) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: key,
        }),
      );
    } catch {
      // Silently ignore delete failures (file may already be gone)
    }
  }

  private getExtFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return map[mime] || '.jpg';
  }
}
