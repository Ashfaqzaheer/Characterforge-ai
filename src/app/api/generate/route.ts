import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAuthenticatedUser } from "../../../lib/auth-helpers";
import { generateSchema, validateInput } from "../../../lib/validation";
import { checkAndSetKey, clearKey } from "../../../lib/idempotency";
import {
  generate,
  PromptRejectedError,
  CharacterNotFoundError,
  GenerationFailedError,
  InsufficientCreditsError,
  ForbiddenError,
} from "../../../services/generation.service";

/**
 * POST /api/generate — Trigger AI image generation for a character.
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

  const validation = validateInput(generateSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: validation.message } },
      { status: 400 }
    );
  }

  const { characterId, prompt, aspectRatio } = validation.data;

  // Idempotency check: prevent duplicate generations from double-submits/retries.
  // Must happen BEFORE credit deduction (which is inside generate()).
  const idempotencyKey = createHash("sha256")
    .update(`${user.id}:${characterId}:${prompt}:${aspectRatio}`)
    .digest("hex")
    .slice(0, 32);

  if (checkAndSetKey(idempotencyKey)) {
    return NextResponse.json(
      {
        error: {
          code: "DUPLICATE_REQUEST",
          message: "An identical generation request was just submitted. Please wait a moment before trying again.",
        },
      },
      { status: 409 }
    );
  }

  try {
    const generation = await generate(user.id, characterId, prompt, aspectRatio);
    return NextResponse.json({ generation }, { status: 201 });
  } catch (error) {
    if (error instanceof PromptRejectedError) {
      return NextResponse.json(
        { error: { code: "PROMPT_REJECTED", message: error.reason } },
        { status: 400 }
      );
    }

    if (error instanceof CharacterNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Character not found" } },
        { status: 404 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this resource",
          },
        },
        { status: 403 }
      );
    }

    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: "Insufficient credit balance",
          },
        },
        { status: 402 }
      );
    }

    if (error instanceof GenerationFailedError) {
      return NextResponse.json(
        {
          error: {
            code: "GENERATION_FAILED",
            message: error.userMessage,
          },
        },
        { status: 500 }
      );
    }

    // Unexpected error — never expose internals
    console.error("Unexpected error in /api/generate:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  } finally {
    // Clear the idempotency key so the user can retry after success or failure
    clearKey(idempotencyKey);
  }
}
