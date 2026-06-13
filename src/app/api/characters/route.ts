import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth-helpers";
import { createCharacterSchema, validateInput } from "../../../lib/validation";
import {
  createCharacter,
  listCharacters,
} from "../../../services/character.service";

/**
 * GET /api/characters — List the authenticated user's characters.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const characters = await listCharacters(user.id);
    return NextResponse.json({ characters });
  } catch (error) {
    console.error("Unexpected error in GET /api/characters:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/characters — Create a new character.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const validation = validateInput(createCharacterSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: validation.message } },
      { status: 400 }
    );
  }

  try {
    const character = await createCharacter(user.id, validation.data);
    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/characters:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
