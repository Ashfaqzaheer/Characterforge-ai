import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth-helpers";
import {
  deleteCharacter,
  ForbiddenError,
  getCharacterById,
} from "../../../../services/character.service";

/**
 * GET /api/characters/[id] — Get a character with its reference images.
 */
export async function GET(
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
    const character = await getCharacterById(user.id, id);
    if (!character) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ character });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this resource" } },
        { status: 403 }
      );
    }
    console.error("Unexpected error in GET /api/characters/[id]:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/characters/[id] — Delete a character and cascade related data.
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
    const result = await deleteCharacter(user.id, id);
    if (!result) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this resource" } },
        { status: 403 }
      );
    }
    console.error("Unexpected error in DELETE /api/characters/[id]:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
