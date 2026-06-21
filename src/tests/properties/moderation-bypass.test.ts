// Feature: character-forge-ai — negativePrompt moderation bypass fix
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

const mockCharacterCreate = vi.fn();
const mockCharacterUpdate = vi.fn();
const mockCharacterFindUnique = vi.fn();
const mockGenerationCreate = vi.fn();
const mockGenerationDelete = vi.fn();
const mockDeduct = vi.fn();

vi.mock("../../lib/db", () => ({
  prisma: {
    character: {
      get create() { return mockCharacterCreate; },
      get update() { return mockCharacterUpdate; },
      get findUnique() { return mockCharacterFindUnique; },
    },
    generation: {
      get create() { return mockGenerationCreate; },
      get delete() { return mockGenerationDelete; },
    },
  },
}));

vi.mock("../../lib/r2", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  uploadFile: vi.fn().mockResolvedValue(undefined),
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.example.com/img.png"),
}));

vi.mock("../../lib/replicate", () => ({
  generateImage: vi.fn().mockResolvedValue({ success: true, imageUrl: "data:image/png;base64,abc" }),
}));

vi.mock("../../services/credit.service", () => ({
  deduct: (...args: any[]) => mockDeduct(...args),
  refund: vi.fn().mockResolvedValue(undefined),
  InsufficientCreditsError: class extends Error { constructor() { super("Insufficient"); this.name = "InsufficientCreditsError"; } },
}));

const BLOCKED_KEYWORDS = ["nude", "nsfw", "gore", "violent death", "self-harm", "child abuse"];

describe("NegativePrompt moderation bypass fix", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("createCharacter rejects negativePrompt containing blocked keywords", async () => {
    const { createCharacter } = await import("../../services/character.service");
    const { PromptRejectedError } = await import("../../lib/errors");

    for (const keyword of BLOCKED_KEYWORDS) {
      vi.clearAllMocks();
      await expect(
        createCharacter("user-1", { name: "Test", description: "A character", negativePrompt: `avoid ${keyword} content` })
      ).rejects.toThrow(PromptRejectedError);
      expect(mockCharacterCreate).not.toHaveBeenCalled();
    }
  });

  it("updateCharacter rejects negativePrompt containing blocked keywords", async () => {
    const { updateCharacter } = await import("../../services/character.service");
    const { PromptRejectedError } = await import("../../lib/errors");

    mockCharacterFindUnique.mockResolvedValue({ id: "char-1", userId: "user-1" });

    for (const keyword of BLOCKED_KEYWORDS) {
      vi.clearAllMocks();
      mockCharacterFindUnique.mockResolvedValue({ id: "char-1", userId: "user-1" });
      await expect(
        updateCharacter("user-1", "char-1", { name: "Test", description: "A character", negativePrompt: `show ${keyword} stuff` })
      ).rejects.toThrow(PromptRejectedError);
      expect(mockCharacterUpdate).not.toHaveBeenCalled();
    }
  });

  it("generate rejects when character negativePrompt contains blocked keyword, before credit deduction", async () => {
    const { generate } = await import("../../services/generation.service");
    const { PromptRejectedError } = await import("../../lib/errors");

    mockCharacterFindUnique.mockResolvedValue({
      id: "char-1",
      userId: "user-1",
      name: "Bad Character",
      description: "Looks normal",
      negativePrompt: "nude explicit content",
      images: [{ id: "img-1", storageKey: "refs/key.png" }],
    });

    await expect(generate("user-1", "char-1", "walking in park")).rejects.toThrow(PromptRejectedError);
    expect(mockDeduct).not.toHaveBeenCalled();
    expect(mockGenerationCreate).not.toHaveBeenCalled();
  });
});
