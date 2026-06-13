import { z } from "zod";

// --- Character Schemas ---

export const characterNameSchema = z
  .string()
  .min(1, "Character name is required")
  .max(100, "Character name must be at most 100 characters");

export const characterDescriptionSchema = z
  .string()
  .min(1, "Character description is required")
  .max(1000, "Character description must be at most 1000 characters");

export const createCharacterSchema = z.object({
  name: characterNameSchema,
  description: characterDescriptionSchema,
  age: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  style: z.string().max(200).optional(),
  outfit: z.string().max(500).optional(),
  personality: z.string().max(500).optional(),
  negativePrompt: z.string().max(500).optional(),
  hairDescription: z.string().max(200).optional(),
  faceDescription: z.string().max(200).optional(),
  eyeColor: z.string().max(50).optional(),
  bodyType: z.string().max(100).optional(),
  colorPalette: z.string().max(200).optional(),
});

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;

// --- Aspect Ratio ---

export const ALLOWED_ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:5", "3:4", "21:9"] as const;
export type AspectRatio = (typeof ALLOWED_ASPECT_RATIOS)[number];

// --- Generation Schemas ---

export const generateSchema = z.object({
  characterId: z.string().min(1, "Character ID is required"),
  prompt: z.string().min(1, "Prompt is required").max(500, "Prompt must be at most 500 characters"),
  aspectRatio: z.enum(ALLOWED_ASPECT_RATIOS).default("9:16"),
});

export type GenerateInput = z.infer<typeof generateSchema>;

// --- Validation Helpers ---

/**
 * Validates input against a Zod schema and returns the parsed data or an error message.
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; message: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstIssue = result.error.issues[0];
  return { success: false, message: firstIssue?.message ?? "Validation failed" };
}
