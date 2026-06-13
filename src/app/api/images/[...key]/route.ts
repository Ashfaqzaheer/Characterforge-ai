import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth-helpers";
import { getSignedUrl } from "../../../../lib/r2";
import { prisma } from "../../../../lib/db";

/**
 * GET /api/images/[...key] — Get a signed URL for an image.
 * Uses catch-all route to handle keys with slashes (e.g. generations/userId/genId/file.png).
 * Verifies the authenticated user owns the image (via character or generation).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { key } = await params;

  // Join the catch-all segments back into the full storage key
  const storageKey = key.join("/");

  try {
    // Check if this is a reference image owned by the user
    const refImage = await prisma.referenceImage.findFirst({
      where: {
        storageKey,
        character: { userId: user.id },
      },
    });

    // Check if this is a generation image owned by the user
    const generation = refImage
      ? null
      : await prisma.generation.findFirst({
          where: {
            imageKey: storageKey,
            userId: user.id,
          },
        });

    if (!refImage && !generation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Image not found" } },
        { status: 404 }
      );
    }

    const signedUrl = await getSignedUrl(storageKey);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Unexpected error in GET /api/images/[...key]:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
