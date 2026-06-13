import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../../lib/auth-helpers";
import {
  deleteImage,
  UploadValidationError,
} from "../../../../../../services/upload.service";

/**
 * DELETE /api/characters/[id]/images/[imageId] — Delete a reference image.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { imageId } = await params;

  try {
    const result = await deleteImage(user.id, imageId);
    if (!result) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Image not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof UploadValidationError && error.code === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this resource" } },
        { status: 403 }
      );
    }
    console.error("Unexpected error in DELETE /api/characters/[id]/images/[imageId]:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
