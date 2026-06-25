import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth-helpers";
import { createCharacterSchema, validateInput } from "../../../lib/validation";
import {
  createCharacter,
  listCharacters,
  PromptRejectedError,
} from "../../../services/character.service";
import { FREE_TIER } from "../../../lib/free-tier";
import { prisma } from "../../../lib/db";

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

  // Free tier character limit check (after validation so invalid input gets 400 first)
  const isPaidUser =
    user.creditBalance > FREE_TIER.INITIAL_CREDITS ||
    (await prisma.purchaseRecord.count({ where: { userId: user.id } })) > 0;

  if (!isPaidUser) {
    const characterCount = await prisma.character.count({
      where: { userId: user.id },
    });
    if (characterCount >= FREE_TIER.MAX_CHARACTERS) {
      return NextResponse.json(
        {
          error: {
            code: "CHARACTER_LIMIT_REACHED",
            message: `Free accounts can create up to ${FREE_TIER.MAX_CHARACTERS} characters. Buy credits to unlock unlimited characters.`,
          },
        },
        { status: 403 }
      );
    }
  }

  try {
    const character = await createCharacter(user.id, validation.data);
    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    if (error instanceof PromptRejectedError) {
      return NextResponse.json(
        { error: { code: "PROMPT_REJECTED", message: error.reason } },
        { status: 400 }
      );
    }
    console.error("Unexpected error in POST /api/characters:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
