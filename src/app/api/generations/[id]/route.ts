import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth-helpers";
import { prisma } from "../../../../lib/db";
import { deleteFile } from "../../../../lib/r2";

/**
 * DELETE /api/generations/[id] — Delete a generation history item.
 * Verifies ownership, removes storage file if exists, deletes DB record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const generation = await prisma.generation.findUnique({
      where: { id },
    });

    if (!generation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Generation not found" } },
        { status: 404 }
      );
    }

    if (generation.userId !== user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this resource" } },
        { status: 403 }
      );
    }

    // Delete stored image from R2/mock if it has an imageKey
    if (generation.imageKey) {
      await deleteFile(generation.imageKey).catch(() => {});
    }

    // Delete the generation record (cascades credit transactions via Prisma)
    await prisma.generation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting generation:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete generation" } },
      { status: 500 }
    );
  }
}
