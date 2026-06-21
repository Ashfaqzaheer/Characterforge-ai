import { prisma } from "../lib/db";
import { deleteFile } from "../lib/r2";
import { moderatePrompt } from "../lib/moderation";
import { PromptRejectedError } from "../lib/errors";

export { PromptRejectedError };

/**
 * Creates a new character for the given user.
 */
export async function createCharacter(
  userId: string,
  data: {
    name: string;
    description: string;
    age?: string;
    gender?: string;
    style?: string;
    outfit?: string;
    personality?: string;
    negativePrompt?: string;
    hairDescription?: string;
    faceDescription?: string;
    eyeColor?: string;
    bodyType?: string;
    colorPalette?: string;
  }
) {
  if (data.negativePrompt) {
    const mod = moderatePrompt(data.negativePrompt);
    if (!mod.allowed) {
      throw new PromptRejectedError(mod.reason!);
    }
  }

  return prisma.character.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      age: data.age || null,
      gender: data.gender || null,
      style: data.style || null,
      outfit: data.outfit || null,
      personality: data.personality || null,
      negativePrompt: data.negativePrompt || null,
      hairDescription: data.hairDescription || null,
      faceDescription: data.faceDescription || null,
      eyeColor: data.eyeColor || null,
      bodyType: data.bodyType || null,
      colorPalette: data.colorPalette || null,
    },
  });
}

/**
 * Lists all characters belonging to the given user.
 */
export async function listCharacters(userId: string) {
  return prisma.character.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Gets a character by ID with its reference images.
 * Returns null if not found or not owned by the user.
 * Throws "FORBIDDEN" if the character exists but belongs to another user.
 */
export async function getCharacterById(userId: string, characterId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { images: true },
  });

  if (!character) {
    return null;
  }

  if (character.userId !== userId) {
    throw new ForbiddenError();
  }

  return character;
}

/**
 * Deletes a character and cascades:
 * - Removes reference images from R2 storage
 * - Removes generation records (handled by Prisma cascade)
 * - Removes the character record itself
 *
 * Throws "FORBIDDEN" if the character belongs to another user.
 * Returns null if the character doesn't exist.
 */
export async function deleteCharacter(userId: string, characterId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { images: true },
  });

  if (!character) {
    return null;
  }

  if (character.userId !== userId) {
    throw new ForbiddenError();
  }

  // Delete reference images from R2 storage
  for (const img of character.images) {
    await deleteFile(img.storageKey);
  }

  await prisma.character.delete({
    where: { id: characterId },
  });

  return { deleted: true, imageKeys: character.images.map((img) => img.storageKey) };
}

// --- Errors ---

export class ForbiddenError extends Error {
  constructor() {
    super("You do not have access to this resource");
    this.name = "ForbiddenError";
  }
}

/**
 * Updates a character's fields. Verifies ownership.
 */
export async function updateCharacter(
  userId: string,
  characterId: string,
  data: {
    name: string;
    description: string;
    age?: string;
    gender?: string;
    style?: string;
    outfit?: string;
    personality?: string;
    negativePrompt?: string;
    hairDescription?: string;
    faceDescription?: string;
    eyeColor?: string;
    bodyType?: string;
    colorPalette?: string;
  }
) {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return null;
  if (character.userId !== userId) throw new ForbiddenError();

  if (data.negativePrompt) {
    const mod = moderatePrompt(data.negativePrompt);
    if (!mod.allowed) {
      throw new PromptRejectedError(mod.reason!);
    }
  }

  return prisma.character.update({
    where: { id: characterId },
    data: {
      name: data.name,
      description: data.description,
      age: data.age || null,
      gender: data.gender || null,
      style: data.style || null,
      outfit: data.outfit || null,
      personality: data.personality || null,
      negativePrompt: data.negativePrompt || null,
      hairDescription: data.hairDescription || null,
      faceDescription: data.faceDescription || null,
      eyeColor: data.eyeColor || null,
      bodyType: data.bodyType || null,
      colorPalette: data.colorPalette || null,
    },
  });
}
