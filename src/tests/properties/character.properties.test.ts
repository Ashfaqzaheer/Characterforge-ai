// Feature: character-forge-ai, Property 4: Character name and description length validation
// Feature: character-forge-ai, Property 5: Character ownership association
// Feature: character-forge-ai, Property 12: Data isolation between users
// Feature: character-forge-ai, Property 13: Character deletion cascades
// Validates: Requirements 2.1, 2.2, 2.3, 2.5, 4.2, 4.4, 4.5

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// --- Mocks ---

const mockCharacterCreate = vi.fn();
const mockCharacterFindMany = vi.fn();
const mockCharacterFindUnique = vi.fn();
const mockCharacterDelete = vi.fn();

vi.mock("../../lib/db", () => ({
  prisma: {
    character: {
      get create() { return mockCharacterCreate; },
      get findMany() { return mockCharacterFindMany; },
      get findUnique() { return mockCharacterFindUnique; },
      get delete() { return mockCharacterDelete; },
    },
  },
}));

vi.mock("../../lib/auth-helpers", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("../../lib/r2", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  uploadFile: vi.fn().mockResolvedValue(undefined),
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
}));

// --- Generators ---

const uuidArb = fc.uuid();

// Valid name: 1-100 characters
const validNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

// Valid description: 1-1000 characters
const validDescriptionArb = fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0);

// Invalid name: empty or >100 characters
const invalidNameArb = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 101, maxLength: 200 })
);

// Invalid description: empty or >1000 characters
const invalidDescriptionArb = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 1001, maxLength: 1200 })
);

// --- Tests ---

describe("Property 4: Character name and description length validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("character creation succeeds when name is 1-100 chars and description is 1-1000 chars", async () => {
    const { createCharacterSchema } = await import("../../lib/validation");

    await fc.assert(
      fc.asyncProperty(validNameArb, validDescriptionArb, async (name, description) => {
        const result = createCharacterSchema.safeParse({ name, description });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("character creation fails when name is empty or exceeds 100 characters", async () => {
    const { createCharacterSchema } = await import("../../lib/validation");

    await fc.assert(
      fc.asyncProperty(invalidNameArb, validDescriptionArb, async (name, description) => {
        const result = createCharacterSchema.safeParse({ name, description });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("character creation fails when description is empty or exceeds 1000 characters", async () => {
    const { createCharacterSchema } = await import("../../lib/validation");

    await fc.assert(
      fc.asyncProperty(validNameArb, invalidDescriptionArb, async (name, description) => {
        const result = createCharacterSchema.safeParse({ name, description });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("validation rejects both invalid name and invalid description simultaneously", async () => {
    const { createCharacterSchema } = await import("../../lib/validation");

    await fc.assert(
      fc.asyncProperty(invalidNameArb, invalidDescriptionArb, async (name, description) => {
        const result = createCharacterSchema.safeParse({ name, description });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("API returns 400 for invalid character input via POST /api/characters", async () => {
    const { getAuthenticatedUser } = await import("../../lib/auth-helpers");
    const mockGetAuth = vi.mocked(getAuthenticatedUser);
    const { POST } = await import("../../app/api/characters/route");

    await fc.assert(
      fc.asyncProperty(uuidArb, invalidNameArb, validDescriptionArb, async (userId, name, description) => {
        vi.clearAllMocks();

        mockGetAuth.mockResolvedValue({
          id: userId,
          supabaseId: `sup-${userId}`,
          email: "test@example.com",
          creditBalance: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        const request = new Request("http://localhost/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });

        const response = await POST(request as any);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("VALIDATION_ERROR");
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 5: Character ownership association", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("created character is associated with the authenticated user and has a valid creation timestamp", async () => {
    const { getAuthenticatedUser } = await import("../../lib/auth-helpers");
    const mockGetAuth = vi.mocked(getAuthenticatedUser);
    const { POST } = await import("../../app/api/characters/route");

    await fc.assert(
      fc.asyncProperty(uuidArb, validNameArb, validDescriptionArb, async (userId, name, description) => {
        vi.clearAllMocks();

        const now = new Date();
        const characterId = crypto.randomUUID();

        mockGetAuth.mockResolvedValue({
          id: userId,
          supabaseId: `sup-${userId}`,
          email: "user@example.com",
          creditBalance: 10,
          createdAt: now,
          updatedAt: now,
        } as any);

        mockCharacterCreate.mockResolvedValue({
          id: characterId,
          userId,
          name,
          description,
          createdAt: now,
          updatedAt: now,
        });

        const request = new Request("http://localhost/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.character.userId).toBe(userId);
        expect(data.character.name).toBe(name);
        expect(data.character.description).toBe(description);
        expect(new Date(data.character.createdAt).getTime()).toBeLessThanOrEqual(Date.now());

        // Verify Prisma was called with the correct userId
        expect(mockCharacterCreate).toHaveBeenCalledWith({
          data: expect.objectContaining({ userId, name, description }),
        });
      }),
      { numRuns: 100 }
    );
  });

  it("character is retrievable only by its owning user", async () => {
    const { getCharacterById } = await import("../../services/character.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (ownerId, characterId) => {
        vi.clearAllMocks();

        const now = new Date();
        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId: ownerId,
          name: "Test Character",
          description: "A test character",
          createdAt: now,
          updatedAt: now,
          images: [],
        });

        // Owner can access the character
        const result = await getCharacterById(ownerId, characterId);
        expect(result).not.toBeNull();
        expect(result!.userId).toBe(ownerId);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 12: Data isolation between users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listing characters for user A never returns characters owned by user B", async () => {
    const { listCharacters } = await import("../../services/character.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        fc.array(validNameArb, { minLength: 1, maxLength: 5 }),
        async (userAId, userBId, names) => {
          // Ensure distinct users
          fc.pre(userAId !== userBId);
          vi.clearAllMocks();

          const userACharacters = names.map((name, i) => ({
            id: `char-a-${i}`,
            userId: userAId,
            name,
            description: `Description ${i}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // When user A lists, only their characters are returned
          mockCharacterFindMany.mockResolvedValue(userACharacters);

          const resultA = await listCharacters(userAId);

          // All returned characters belong to user A
          for (const char of resultA) {
            expect(char.userId).toBe(userAId);
            expect(char.userId).not.toBe(userBId);
          }

          // Verify Prisma was queried with userId filter
          expect(mockCharacterFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId: userAId },
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("requesting a character owned by another user returns 403 Forbidden", async () => {
    const { getCharacterById, ForbiddenError } = await import("../../services/character.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, uuidArb, async (ownerUserId, otherUserId, characterId) => {
        // Ensure distinct users
        fc.pre(ownerUserId !== otherUserId);
        vi.clearAllMocks();

        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId: ownerUserId,
          name: "Owned Character",
          description: "Belongs to owner",
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
        });

        // Other user attempting to access should throw ForbiddenError
        await expect(getCharacterById(otherUserId, characterId)).rejects.toThrow(ForbiddenError);
      }),
      { numRuns: 100 }
    );
  });

  it("API returns 403 when user requests another user's character via GET /api/characters/[id]", async () => {
    const { getAuthenticatedUser } = await import("../../lib/auth-helpers");
    const mockGetAuth = vi.mocked(getAuthenticatedUser);
    const { GET } = await import("../../app/api/characters/[id]/route");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, uuidArb, async (ownerUserId, requestingUserId, characterId) => {
        fc.pre(ownerUserId !== requestingUserId);
        vi.clearAllMocks();

        mockGetAuth.mockResolvedValue({
          id: requestingUserId,
          supabaseId: `sup-${requestingUserId}`,
          email: "other@example.com",
          creditBalance: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId: ownerUserId,
          name: "Private Character",
          description: "Not yours",
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
        });

        const request = new Request(`http://localhost/api/characters/${characterId}`, {
          method: "GET",
          headers: { Authorization: "Bearer fake-token" },
        });

        const response = await GET(request as any, { params: Promise.resolve({ id: characterId }) });
        expect(response.status).toBe(403);

        const data = await response.json();
        expect(data.error.code).toBe("FORBIDDEN");
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 13: Character deletion cascades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deleting a character removes associated reference images and returns their storage keys", async () => {
    const { deleteCharacter } = await import("../../services/character.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        fc.array(
          fc.record({
            id: fc.uuid(),
            storageKey: fc.stringMatching(/^references\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\.png$/),
            filename: fc.stringMatching(/^[a-z0-9]+\.png$/),
            mimeType: fc.constant("image/png"),
            sizeBytes: fc.integer({ min: 1000, max: 5000000 }),
            width: fc.integer({ min: 100, max: 4096 }),
            height: fc.integer({ min: 100, max: 4096 }),
            uploadedAt: fc.constant(new Date()),
          }),
          { minLength: 0, maxLength: 3 }
        ),
        async (userId, characterId, images) => {
          vi.clearAllMocks();

          const imagesWithCharacterId = images.map((img) => ({
            ...img,
            characterId,
          }));

          mockCharacterFindUnique.mockResolvedValue({
            id: characterId,
            userId,
            name: "Character to delete",
            description: "Will be deleted",
            createdAt: new Date(),
            updatedAt: new Date(),
            images: imagesWithCharacterId,
          });

          mockCharacterDelete.mockResolvedValue({
            id: characterId,
            userId,
            name: "Character to delete",
            description: "Will be deleted",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await deleteCharacter(userId, characterId);

          // Deletion should succeed
          expect(result).not.toBeNull();
          expect(result!.deleted).toBe(true);

          // Should return all image storage keys for R2 cleanup
          expect(result!.imageKeys).toHaveLength(images.length);
          for (let i = 0; i < images.length; i++) {
            expect(result!.imageKeys).toContain(images[i].storageKey);
          }

          // Prisma delete should have been called
          expect(mockCharacterDelete).toHaveBeenCalledWith({
            where: { id: characterId },
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deleting another user's character throws ForbiddenError (no cascade occurs)", async () => {
    const { deleteCharacter, ForbiddenError } = await import("../../services/character.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, uuidArb, async (ownerId, otherUserId, characterId) => {
        fc.pre(ownerId !== otherUserId);
        vi.clearAllMocks();

        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId: ownerId,
          name: "Owner's character",
          description: "Cannot be deleted by others",
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [{ id: "img-1", storageKey: "references/key.png", characterId }],
        });

        // Another user cannot delete it
        await expect(deleteCharacter(otherUserId, characterId)).rejects.toThrow(ForbiddenError);

        // Prisma delete should NOT have been called
        expect(mockCharacterDelete).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it("API DELETE /api/characters/[id] triggers cascade and returns success", async () => {
    const { getAuthenticatedUser } = await import("../../lib/auth-helpers");
    const mockGetAuth = vi.mocked(getAuthenticatedUser);
    const { DELETE } = await import("../../app/api/characters/[id]/route");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (userId, characterId) => {
        vi.clearAllMocks();

        mockGetAuth.mockResolvedValue({
          id: userId,
          supabaseId: `sup-${userId}`,
          email: "owner@example.com",
          creditBalance: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        mockCharacterFindUnique.mockResolvedValue({
          id: characterId,
          userId,
          name: "My character",
          description: "To be deleted",
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [
            { id: "img-1", storageKey: "references/key1.png", characterId },
            { id: "img-2", storageKey: "references/key2.png", characterId },
          ],
        });

        mockCharacterDelete.mockResolvedValue({ id: characterId });

        const request = new Request(`http://localhost/api/characters/${characterId}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer fake-token" },
        });

        const response = await DELETE(request as any, { params: Promise.resolve({ id: characterId }) });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);

        // Prisma delete was called (Prisma cascade handles related records)
        expect(mockCharacterDelete).toHaveBeenCalledWith({
          where: { id: characterId },
        });
      }),
      { numRuns: 100 }
    );
  });
});
