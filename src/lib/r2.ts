import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "characterforge-images";

const MOCK_STORAGE = !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY;

// In-memory store for mock mode
const mockStore = new Map<string, { body: Buffer; contentType: string }>();

const s3Client = MOCK_STORAGE
  ? null
  : new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

/**
 * Uploads a file buffer to R2 storage (or mock in-memory store).
 */
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (MOCK_STORAGE) {
    mockStore.set(key, { body, contentType });
    return;
  }
  await s3Client!.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/**
 * Deletes a file from R2 storage (or mock in-memory store).
 */
export async function deleteFile(key: string): Promise<void> {
  if (MOCK_STORAGE) {
    mockStore.delete(key);
    return;
  }
  await s3Client!.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Generates a signed URL for reading a file from R2.
 * In mock mode, returns the stored image as a data URI if available.
 * Defaults to 1 hour expiry (3600 seconds).
 */
export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (MOCK_STORAGE) {
    // Return stored image as data URI if available
    const stored = mockStore.get(key);
    if (stored) {
      const base64 = stored.body.toString("base64");
      return `data:${stored.contentType};base64,${base64}`;
    }
    return `https://placehold.co/512x512/1a1a2e/ffffff?text=Image`;
  }
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return awsGetSignedUrl(s3Client!, command, { expiresIn });
}
