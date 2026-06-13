// Feature: character-forge-ai, Property 14: Successful generation produces complete record
// Feature: character-forge-ai, Property 15: Failed generation returns safe error
// Validates: Requirements 5.3, 5.4, 5.7, 10.3

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// --- Mocks ---

const mockCharacterFindUnique = vi.fn();
const mockGenerationCreate = vi.fn();
const mockGenerationUpdate = vi.fn();
const mockGenerationDelete = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../../lib/db", () => ({
  prisma: {
    character: {
      get findUnique() { return mockCharacterFindUnique; },
    },
    generation: {
      get create() { return mockGenerationCreate; },
      get update() { return mockGenerationUpdate; },
      get delete() { return mockGenerationDelete; },
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

const mockGetSignedUrl = vi.fn();
const mockUploadFile = vi.fn();

vi.mock("../../lib/r2", () => ({
  get getSignedUrl() { return mockGetSignedUrl; },
  get uploadFile() { return mockUploadFile; },
}));

const mockGenerateImage = vi.fn();

vi.mock("../../lib/replicate", () => ({
  get generateImage() { return mockGenerateImage; },
}));

const mockDeduct = vi.fn();
const mockRefund = vi.fn();

vi.mock("../../services/credit.service", () => ({
  get deduct() { return mockDeduct; },
  get refund() { return mockRefund; },
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    constructor() {
      super("Insufficient credits");
      this.name = "InsufficientCreditsError";
    }
  },
}));

vi.mock("../../services/character.service", () => ({
  ForbiddenError: class ForbiddenError extends Error {
    constructor() {
      super("Forbidden");
      this.name = "ForbiddenError";
    }
  },
}));

// Mock fetch for downloading generated images
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// --- Generators ---

const uuidArb = fc.uuid();
const safePromptArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ,.!?]{0,199}$/);
const imageUrlArb = fc.constant("https://replicate.delivery/output.png");

// --- Tests ---

describe("Property 14: Successful generation produces complete record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any valid generation request, the resulting record contains prompt, characterId, imageKey, and COMPLETED status", async () => {
    const { generate } = await import("../../services/generation.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        safePromptArb,
        imageUrlArb,
        fc.integer({ min: 1, max: 3 }),
        async (userId, characterId, generationId, prompt, replicateImageUrl, numImages) => {
          vi.clearAllMocks();

          const images = Array.from({ length: numImages }, (_, i) => ({
            id: `img-${i}`,
            characterId,
            storageKey: `references/${userId}/${characterId}/img${i}.png`,
            filename: `img${i}.png`,
            mimeType: "image/png",
            sizeBytes: 1000,
            width: 512,
            height: 512,
            uploadedAt: new Date(),
          }));

          // Mock character with images
          mockCharacterFindUnique.mockResolvedValue({
            id: characterId,
            userId,
            name: "Test Character",
            description: "A test character",
            images,
          });

          // Mock generation record creation
          mockGenerationCreate.mockResolvedValue({
            id: generationId,
            userId,
            characterId,
            prompt,
            status: "PROCESSING",
            imageKey: null,
            errorMessage: null,
            createdAt: new Date(),
            completedAt: null,
          });

          // Mock credit deduction succeeds
          mockDeduct.mockResolvedValue(undefined);

          // Mock signed URLs for reference images
          mockGetSignedUrl.mockImplementation((key: string) =>
            Promise.resolve(`https://signed.example.com/${key}`)
          );

          // Mock Replicate API success
          mockGenerateImage.mockResolvedValue({
            success: true,
            imageUrl: replicateImageUrl,
          });

          // Mock fetch for downloading generated image
          mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          });

          // Mock R2 upload
          mockUploadFile.mockResolvedValue(undefined);

          // Mock generation update to COMPLETED
          let capturedUpdate: any = null;
          mockGenerationUpdate.mockImplementation((args: any) => {
            capturedUpdate = args;
            return Promise.resolve({
              id: generationId,
              userId,
              characterId,
              prompt,
              status: "COMPLETED",
              imageKey: args.data.imageKey,
              errorMessage: null,
              createdAt: new Date(),
              completedAt: args.data.completedAt,
            });
          });

          const result = await generate(userId, characterId, prompt);

          // Result contains the original prompt
          expect(result.prompt).toBe(prompt);

          // Result references the correct character
          expect(result.characterId).toBe(characterId);

          // Result has a valid image key stored in R2
          expect(result.imageKey).toBeTruthy();
          expect(typeof result.imageKey).toBe("string");
          expect(result.imageKey).toContain("generations/");
          expect(result.imageKey).toContain(userId);
          expect(result.imageKey).toContain(generationId);

          // Result has COMPLETED status
          expect(result.status).toBe("COMPLETED");

          // Signed URL was generated for the primary reference image (cost optimization: 1 image)
          expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);

          // Replicate was called with enhanced prompt (includes character memory) and reference image
          expect(mockGenerateImage).toHaveBeenCalledWith({
            prompt: expect.stringContaining(prompt),
            inputImages: expect.arrayContaining([
              expect.stringContaining("https://signed.example.com/"),
            ]),
            negativePrompt: undefined,
          });

          // Image was uploaded to R2
          expect(mockUploadFile).toHaveBeenCalledWith(
            expect.stringContaining("generations/"),
            expect.any(Buffer),
            "image/png"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("generation record is stored in R2 with a key containing userId and generationId", async () => {
    const { generate } = await import("../../services/generation.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, uuidArb, safePromptArb, async (userId, characterId, generationId, prompt) => {
        vi.clearAllMocks();

        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId,
          name: "Char",
          description: "Desc",
          images: [{ id: "img-1", storageKey: "references/key.png" }],
        });

        mockGenerationCreate.mockResolvedValue({
          id: generationId,
          userId,
          characterId,
          prompt,
          status: "PROCESSING",
          imageKey: null,
          errorMessage: null,
          createdAt: new Date(),
          completedAt: null,
        });

        mockDeduct.mockResolvedValue(undefined);
        mockGetSignedUrl.mockResolvedValue("https://signed.example.com/img.png");
        mockGenerateImage.mockResolvedValue({ success: true, imageUrl: "https://replicate.com/output.png" });
        mockFetch.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(512)),
        });
        mockUploadFile.mockResolvedValue(undefined);

        let storedKey = "";
        mockGenerationUpdate.mockImplementation((args: any) => {
          storedKey = args.data.imageKey || "";
          return Promise.resolve({
            id: generationId,
            userId,
            characterId,
            prompt,
            status: "COMPLETED",
            imageKey: storedKey,
            completedAt: new Date(),
          });
        });

        await generate(userId, characterId, prompt);

        // The storage key follows the pattern: generations/{userId}/{generationId}/{uuid}.png
        expect(storedKey).toMatch(new RegExp(`^generations/${userId}/${generationId}/[\\w-]+\\.png$`));
      }),
      { numRuns: 100 }
    );
  });
});


describe("Property 15: Failed generation returns safe error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when Replicate API fails, the error thrown contains a user-friendly message and no internal details", async () => {
    const { generate, GenerationFailedError } = await import("../../services/generation.service");

    // Arbitrary strings that might appear as internal error details
    const internalErrorArb = fc.oneof(
      fc.constant("Connection refused to api.replicate.com:443"),
      fc.constant("REPLICATE_API_TOKEN=sk-abc123xyz"),
      fc.constant("Error: ECONNREFUSED 127.0.0.1:5432"),
      fc.constant("at Object.<anonymous> (/app/node_modules/replicate/index.js:42:11)"),
      fc.constant("PostgresError: relation \"generations\" does not exist"),
      fc.constant("TypeError: Cannot read properties of undefined (reading 'id')"),
      fc.stringMatching(/^[a-z0-9_=\/:\.]{10,60}$/)
    );

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        safePromptArb,
        internalErrorArb,
        async (userId, characterId, generationId, prompt, internalError) => {
          vi.clearAllMocks();

          mockCharacterFindUnique.mockResolvedValue({
            id: characterId,
            userId,
            name: "Char",
            description: "Desc",
            images: [{ id: "img-1", storageKey: "references/key.png" }],
          });

          mockGenerationCreate.mockResolvedValue({
            id: generationId,
            userId,
            characterId,
            prompt,
            status: "PROCESSING",
            imageKey: null,
            errorMessage: null,
            createdAt: new Date(),
            completedAt: null,
          });

          mockDeduct.mockResolvedValue(undefined);
          mockGetSignedUrl.mockResolvedValue("https://signed.example.com/img.png");

          // Replicate returns a failure with an internal-style error message
          mockGenerateImage.mockResolvedValue({
            success: false,
            message: "Image generation failed. Please try again later.",
          });

          mockRefund.mockResolvedValue(undefined);
          mockGenerationUpdate.mockResolvedValue({
            id: generationId,
            status: "FAILED",
            errorMessage: "Image generation failed. Please try again later.",
          });

          try {
            await generate(userId, characterId, prompt);
            // Should not reach here
            expect.fail("Expected GenerationFailedError to be thrown");
          } catch (error: any) {
            expect(error).toBeInstanceOf(GenerationFailedError);

            // The user-facing message should be friendly
            expect(error.userMessage).toBeTruthy();
            expect(typeof error.userMessage).toBe("string");

            // The message must NOT contain API keys or tokens
            expect(error.userMessage).not.toMatch(/sk-[a-zA-Z0-9]+/);
            expect(error.userMessage).not.toMatch(/REPLICATE_API_TOKEN/i);
            expect(error.userMessage).not.toMatch(/SUPABASE/i);
            expect(error.userMessage).not.toMatch(/DATABASE_URL/i);

            // The message must NOT contain stack traces
            expect(error.userMessage).not.toMatch(/at\s+\w+\s*\(/);
            expect(error.userMessage).not.toMatch(/node_modules/);

            // The message must NOT contain internal error details
            expect(error.userMessage).not.toMatch(/ECONNREFUSED/i);
            expect(error.userMessage).not.toMatch(/PostgresError/i);
            expect(error.userMessage).not.toMatch(/TypeError/i);
          }

          // Credit was refunded
          expect(mockRefund).toHaveBeenCalledWith(userId, generationId);

          // Generation record was updated to FAILED
          expect(mockGenerationUpdate).toHaveBeenCalledWith({
            where: { id: generationId },
            data: expect.objectContaining({
              status: "FAILED",
            }),
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("when an unexpected error occurs during generation, the error is safe and credit is refunded", async () => {
    const { generate, GenerationFailedError } = await import("../../services/generation.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, uuidArb, safePromptArb, async (userId, characterId, generationId, prompt) => {
        vi.clearAllMocks();

        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId,
          name: "Char",
          description: "Desc",
          images: [{ id: "img-1", storageKey: "references/key.png" }],
        });

        mockGenerationCreate.mockResolvedValue({
          id: generationId,
          userId,
          characterId,
          prompt,
          status: "PROCESSING",
          imageKey: null,
          errorMessage: null,
          createdAt: new Date(),
          completedAt: null,
        });

        mockDeduct.mockResolvedValue(undefined);
        mockGetSignedUrl.mockResolvedValue("https://signed.example.com/img.png");

        // Replicate throws an unexpected error (network failure, etc.)
        mockGenerateImage.mockRejectedValue(
          new Error("ECONNREFUSED 10.0.0.1:443 - internal network failure")
        );

        mockRefund.mockResolvedValue(undefined);
        mockGenerationUpdate.mockResolvedValue({
          id: generationId,
          status: "FAILED",
        });

        try {
          await generate(userId, characterId, prompt);
          expect.fail("Expected GenerationFailedError");
        } catch (error: any) {
          expect(error).toBeInstanceOf(GenerationFailedError);

          // Should not leak internal error details
          expect(error.userMessage).not.toContain("ECONNREFUSED");
          expect(error.userMessage).not.toContain("10.0.0.1");
          expect(error.userMessage).not.toContain("internal network failure");

          // Should be a user-friendly message
          expect(error.userMessage.length).toBeGreaterThan(0);
          expect(error.userMessage.length).toBeLessThan(200);
        }

        // Credit refunded on unexpected error
        expect(mockRefund).toHaveBeenCalledWith(userId, generationId);
      }),
      { numRuns: 100 }
    );
  });

  it("when image download fails after Replicate succeeds, the error is safe and credit is refunded", async () => {
    const { generate, GenerationFailedError } = await import("../../services/generation.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, uuidArb, safePromptArb, async (userId, characterId, generationId, prompt) => {
        vi.clearAllMocks();

        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId,
          name: "Char",
          description: "Desc",
          images: [{ id: "img-1", storageKey: "references/key.png" }],
        });

        mockGenerationCreate.mockResolvedValue({
          id: generationId,
          userId,
          characterId,
          prompt,
          status: "PROCESSING",
          imageKey: null,
          errorMessage: null,
          createdAt: new Date(),
          completedAt: null,
        });

        mockDeduct.mockResolvedValue(undefined);
        mockGetSignedUrl.mockResolvedValue("https://signed.example.com/img.png");

        // Replicate succeeds but image download fails
        mockGenerateImage.mockResolvedValue({
          success: true,
          imageUrl: "https://replicate.delivery/output.png",
        });

        mockFetch.mockResolvedValue({ ok: false, status: 404 });

        mockRefund.mockResolvedValue(undefined);
        mockGenerationUpdate.mockResolvedValue({
          id: generationId,
          status: "FAILED",
        });

        try {
          await generate(userId, characterId, prompt);
          expect.fail("Expected GenerationFailedError");
        } catch (error: any) {
          expect(error).toBeInstanceOf(GenerationFailedError);

          // Message should not expose internal URLs or status codes
          expect(error.userMessage).not.toContain("replicate.delivery");
          expect(error.userMessage).not.toMatch(/404/);
          expect(error.userMessage).not.toContain("https://");

          // Should mention refund
          expect(error.userMessage.toLowerCase()).toContain("refund");
        }

        // Credit was refunded
        expect(mockRefund).toHaveBeenCalledWith(userId, generationId);

        // Generation record marked as FAILED
        expect(mockGenerationUpdate).toHaveBeenCalledWith({
          where: { id: generationId },
          data: expect.objectContaining({ status: "FAILED" }),
        });
      }),
      { numRuns: 100 }
    );
  });
});
