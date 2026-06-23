import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth-helpers";
import { getCharacterById, ForbiddenError } from "../../../../../services/character.service";
import {
  validateAndUpload,
  UploadValidationError,
  MAX_FILE_SIZE,
  ImageLimitExceededError,
} from "../../../../../services/upload.service";

/**
 * Maximum allowed request body size for this route.
 * MAX_FILE_SIZE (5MB) + 64KB for multipart boundary/headers overhead.
 */
const MAX_REQUEST_BODY_SIZE = MAX_FILE_SIZE + 64 * 1024;

/**
 * POST /api/characters/[id]/images — Upload a reference image for a character.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // --- Pre-check: reject obviously oversized payloads before buffering ---
  // NOTE: Content-Length can be absent (chunked transfer) or spoofed by a malicious
  // client. This is a cheap first-line defense, NOT a complete guarantee. The true
  // backstop is the post-buffer size check in upload.service.ts and the platform's
  // own body size limit (Vercel default: 4.5MB for serverless functions).
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredSize = parseInt(contentLength, 10);
    if (!isNaN(declaredSize) && declaredSize > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "File exceeds maximum allowed size of 5MB" } },
        { status: 413 }
      );
    }
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { id: characterId } = await params;

  // Verify character exists and belongs to user
  try {
    const character = await getCharacterById(user.id, characterId);
    if (!character) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 }
      );
    }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this resource" } },
        { status: 403 }
      );
    }
    console.error("Unexpected error in POST /api/characters/[id]/images:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid form data" } },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "File is required" } },
      { status: 400 }
    );
  }

  // Convert File to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const referenceImage = await validateAndUpload(user.id, characterId, {
      buffer,
      mimeType: file.type,
      originalFilename: file.name,
    });

    return NextResponse.json({ image: referenceImage }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageLimitExceededError) {
      return NextResponse.json(
        { error: { code: "IMAGE_LIMIT_EXCEEDED", message: error.message } },
        { status: 409 }
      );
    }
    if (error instanceof UploadValidationError) {
      const status = error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status }
      );
    }
    console.error("Unexpected error in POST /api/characters/[id]/images:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
