import { randomUUID } from "crypto";
import sharp from "sharp";
import { prisma } from "../lib/db";
import { uploadFile, deleteFile } from "../lib/r2";
import { ImageLimitExceededError } from "../lib/errors";

export { ImageLimitExceededError };

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (Vercel's 4.5MB platform limit minus multipart overhead)
const MAX_DIMENSION = 4096;
const MAX_IMAGES_PER_CHARACTER = 3;

// --- Errors ---

export class UploadValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "UploadValidationError";
    this.code = code;
  }
}

// --- Service ---

/**
 * Validates file type by checking the declared MIME type.
 */
function validateMimeType(mimeType: string): asserts mimeType is AllowedMimeType {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    throw new UploadValidationError(
      "INVALID_FILE_TYPE",
      "File type must be PNG, JPEG, or WebP"
    );
  }
}

/**
 * Validates file size.
 */
function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE) {
    throw new UploadValidationError(
      "FILE_TOO_LARGE",
      "File size must not exceed 4MB"
    );
  }
}

/**
 * Detects actual content type from file buffer using Sharp metadata.
 * Returns the detected format as a MIME type string.
 */
async function detectContentType(buffer: Buffer): Promise<string> {
  const metadata = await sharp(buffer).metadata();
  const format = metadata.format;

  switch (format) {
    case "png":
      return "image/png";
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return `image/${format}`;
  }
}

/**
 * Validates image dimensions do not exceed 4096x4096.
 */
async function validateDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new UploadValidationError(
      "IMAGE_TOO_LARGE",
      "Image dimensions must not exceed 4096x4096 pixels"
    );
  }

  return { width, height };
}

/**
 * Strips EXIF metadata from the image buffer and returns the processed buffer.
 */
async function stripMetadata(
  buffer: Buffer,
  mimeType: AllowedMimeType
): Promise<Buffer> {
  let pipeline = sharp(buffer).rotate(); // .rotate() auto-orients based on EXIF then strips

  switch (mimeType) {
    case "image/png":
      pipeline = pipeline.png();
      break;
    case "image/jpeg":
      pipeline = pipeline.jpeg();
      break;
    case "image/webp":
      pipeline = pipeline.webp();
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Checks how many reference images a character currently has.
 */
async function getImageCount(characterId: string): Promise<number> {
  return prisma.referenceImage.count({
    where: { characterId },
  });
}

/**
 * Validates and uploads a reference image for a character.
 * Full pipeline: validate type → validate size → detect content → validate dimensions
 * → strip EXIF → upload to R2 → save DB record.
 */
export async function validateAndUpload(
  userId: string,
  characterId: string,
  file: { buffer: Buffer; mimeType: string; originalFilename: string }
) {
  // 1. Validate declared MIME type
  validateMimeType(file.mimeType);

  // 2. Validate file size
  validateFileSize(file.buffer.length);

  // 3. Detect actual content type and verify it matches declared type
  const detectedType = await detectContentType(file.buffer);
  if (detectedType !== file.mimeType) {
    throw new UploadValidationError(
      "MIME_MISMATCH",
      "File content does not match the declared file type"
    );
  }

  // 4. Validate dimensions
  const { width, height } = await validateDimensions(file.buffer);

  // 5. Strip EXIF metadata
  const processedBuffer = await stripMetadata(file.buffer, file.mimeType);

  // 6. Generate unique storage key
  const ext = MIME_TO_EXT[file.mimeType];
  const storageKey = `references/${userId}/${characterId}/${randomUUID()}.${ext}`;

  // 7. Upload to R2 OUTSIDE the transaction to avoid holding a DB connection
  // open across an external network call.
  // NOTE: If the transaction below fails after this upload succeeds, the R2 object
  // becomes orphaned. A background cleanup job or R2 lifecycle policy should handle this.
  await uploadFile(storageKey, processedBuffer, file.mimeType);

  // 8. Atomic count + insert inside a transaction to prevent TOCTOU race condition.
  // Without this, two concurrent uploads for the same character could both read count=2,
  // both pass the check, and both insert — exceeding the 3-image limit.
  const referenceImage = await prisma.$transaction(async (tx) => {
    const count = await tx.referenceImage.count({ where: { characterId } });
    if (count >= MAX_IMAGES_PER_CHARACTER) {
      throw new ImageLimitExceededError();
    }

    return tx.referenceImage.create({
      data: {
        characterId,
        storageKey,
        filename: file.originalFilename,
        mimeType: file.mimeType,
        sizeBytes: processedBuffer.length,
        width,
        height,
      },
    });
  });

  return referenceImage;
}

/**
 * Deletes a reference image by ID.
 * Verifies ownership through the character's userId.
 */
export async function deleteImage(userId: string, imageId: string) {
  const image = await prisma.referenceImage.findUnique({
    where: { id: imageId },
    include: { character: { select: { userId: true } } },
  });

  if (!image) {
    return null;
  }

  if (image.character.userId !== userId) {
    throw new UploadValidationError(
      "FORBIDDEN",
      "You do not have access to this resource"
    );
  }

  // Delete from R2
  await deleteFile(image.storageKey);

  // Delete DB record
  await prisma.referenceImage.delete({
    where: { id: imageId },
  });

  return { deleted: true };
}
