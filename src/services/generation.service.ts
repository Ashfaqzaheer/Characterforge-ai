import { randomUUID } from "crypto";
import { prisma } from "../lib/db";
import { moderatePrompt } from "../lib/moderation";
import { generateImage } from "../lib/replicate";
import { getSignedUrl, uploadFile } from "../lib/r2";
import { deduct, refund, InsufficientCreditsError } from "./credit.service";
import { ForbiddenError } from "./character.service";

// --- Character Memory Prompt Builder ---

interface CharacterMemory {
  name: string;
  description: string;
  age?: string | null;
  gender?: string | null;
  style?: string | null;
  outfit?: string | null;
  personality?: string | null;
  hairDescription?: string | null;
  faceDescription?: string | null;
  eyeColor?: string | null;
  bodyType?: string | null;
  colorPalette?: string | null;
}

/**
 * Builds an enhanced prompt by combining Character Memory with the scene prompt.
 * This maximizes character consistency across generations.
 */
function buildCharacterPrompt(character: CharacterMemory, scenePrompt: string): string {
  const parts: string[] = [];

  // Character identity
  parts.push(character.name);
  if (character.description) parts.push(character.description);

  // Physical attributes
  if (character.gender) parts.push(character.gender);
  if (character.age) parts.push(`${character.age} years old`);
  if (character.bodyType) parts.push(character.bodyType);
  if (character.faceDescription) parts.push(character.faceDescription);
  if (character.hairDescription) parts.push(character.hairDescription);
  if (character.eyeColor) parts.push(`${character.eyeColor} eyes`);

  // Style and outfit
  if (character.outfit) parts.push(`wearing ${character.outfit}`);
  if (character.style) parts.push(`${character.style} style`);
  if (character.colorPalette) parts.push(`color palette: ${character.colorPalette}`);

  // Personality for expression
  if (character.personality) parts.push(character.personality);

  // Scene prompt
  parts.push(scenePrompt);

  return parts.join(", ");
}

// --- Aspect Ratio Helpers ---

const ASPECT_RATIO_PROMPT_SUFFIX: Record<string, string> = {
  "9:16": "optimized for vertical mobile viewing",
  "16:9": "optimized for YouTube cinematic landscape framing",
  "1:1": "optimized for social media square composition",
  "4:5": "optimized for portrait composition",
  "3:4": "optimized for storybook portrait composition",
  "21:9": "ultra cinematic widescreen composition",
};

/**
 * Maps aspect ratio string to AI-friendly orientation category.
 */
export function mapAspectRatio(ratio: string): string {
  switch (ratio) {
    case "9:16": return "portrait";
    case "16:9": return "landscape";
    case "1:1": return "square";
    case "4:5": return "portrait";
    case "3:4": return "portrait";
    case "21:9": return "cinematic landscape";
    default: return "portrait";
  }
}

// --- Errors ---

export class PromptRejectedError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "PromptRejectedError";
  }
}

export class CharacterNotFoundError extends Error {
  constructor() {
    super("Character not found");
    this.name = "CharacterNotFoundError";
  }
}

export class GenerationFailedError extends Error {
  constructor(public userMessage: string) {
    super(userMessage);
    this.name = "GenerationFailedError";
  }
}

export { InsufficientCreditsError, ForbiddenError };

/**
 * Orchestrates the full AI generation flow:
 * 1. Validate character ownership
 * 2. Moderate prompt
 * 3. Deduct credit
 * 4. Create Generation record (PROCESSING)
 * 5. Get signed URLs for reference images
 * 6. Call Replicate API
 * 7. Store result in R2
 * 8. Update record (COMPLETED)
 *
 * On failure after credit deduction: refund credit, update record (FAILED).
 */
export async function generate(
  userId: string,
  characterId: string,
  prompt: string,
  aspectRatio: string = "9:16"
) {
  // 1. Validate character ownership
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { images: true },
  });

  if (!character) {
    throw new CharacterNotFoundError();
  }

  if (character.userId !== userId) {
    throw new ForbiddenError();
  }

  // Build enhanced prompt using Character Memory + Scene Prompt
  const enhancedPrompt = buildCharacterPrompt(character, prompt) +
    (ASPECT_RATIO_PROMPT_SUFFIX[aspectRatio] ? `, ${ASPECT_RATIO_PROMPT_SUFFIX[aspectRatio]}` : "");

  // 2. Moderate prompt (use the enhanced version)
  const moderation = moderatePrompt(enhancedPrompt);
  if (!moderation.allowed) {
    throw new PromptRejectedError(moderation.reason!);
  }

  // 3. Deduct credit (throws InsufficientCreditsError if balance < 1)
  // Create generation record first so we have an ID for the transaction
  const generation = await prisma.generation.create({
    data: {
      userId,
      characterId,
      prompt,
      aspectRatio,
      status: "PROCESSING",
    },
  });

  try {
    await deduct(userId, generation.id);
  } catch (error) {
    // Clean up the generation record if credit deduction fails
    await prisma.generation.delete({ where: { id: generation.id } });
    throw error;
  }

  try {
    // 4. Get signed URL for primary reference image (cost optimization: use only 1)
    const primaryImage = character.images[0];
    const imageUrls = primaryImage ? [await getSignedUrl(primaryImage.storageKey)] : [];

    // 5. Call Replicate API with enhanced prompt
    const result = await generateImage({
      prompt: enhancedPrompt,
      inputImages: imageUrls,
      negativePrompt: character.negativePrompt || undefined,
    });

    if (!result.success) {
      // Generation failed — refund and mark as failed
      await refund(userId, generation.id);
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "FAILED",
          errorMessage: result.message,
          completedAt: new Date(),
        },
      });
      throw new GenerationFailedError(result.message);
    }

    // 6. Store generated image
    const imageKey = `generations/${userId}/${generation.id}/${randomUUID()}.png`;

    let imageBuffer: Buffer;

    if (result.imageUrl.startsWith("data:")) {
      // Base64 data URI (from HuggingFace) — extract buffer directly
      const base64Data = result.imageUrl.split(",")[1];
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      // URL-based image (from Replicate) — download it
      const imageResponse = await fetch(result.imageUrl);
      if (!imageResponse.ok) {
        await refund(userId, generation.id);
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: "FAILED",
            errorMessage: "Failed to retrieve generated image",
            completedAt: new Date(),
          },
        });
        throw new GenerationFailedError(
          "Failed to retrieve generated image. Credit has been refunded."
        );
      }
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    }

    await uploadFile(imageKey, imageBuffer, "image/png");

    // 7. Update record to COMPLETED
    const updatedGeneration = await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        imageKey,
        completedAt: new Date(),
      },
    });

    return updatedGeneration;
  } catch (error) {
    // If it's already one of our known errors, re-throw
    if (
      error instanceof GenerationFailedError ||
      error instanceof InsufficientCreditsError
    ) {
      throw error;
    }

    // Unexpected error — refund and mark as failed
    await refund(userId, generation.id);
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "FAILED",
        errorMessage: "An unexpected error occurred",
        completedAt: new Date(),
      },
    });
    throw new GenerationFailedError(
      "Image generation failed unexpectedly. Credit has been refunded."
    );
  }
}
