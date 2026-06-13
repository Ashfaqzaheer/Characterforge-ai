// Feature: character-forge-ai, Property 16: Generation history ordering and completeness
// Feature: character-forge-ai, Property 17: Generation history pagination
// Validates: Requirements 6.1, 6.2, 6.3

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// --- Mocks ---

const mockGenerationFindMany = vi.fn();
const mockGenerationCount = vi.fn();

vi.mock("../../lib/db", () => ({
  prisma: {
    generation: {
      get findMany() { return mockGenerationFindMany; },
      get count() { return mockGenerationCount; },
    },
  },
}));

// --- Generators ---

const uuidArb = fc.uuid();

function buildRecords(userId: string, count: number) {
  const baseTime = new Date("2025-01-01").getTime();
  const records = [];
  for (let i = 0; i < count; i++) {
    // Create records with distinct, descending timestamps
    const createdAt = new Date(baseTime - i * 60000);
    records.push({
      id: `gen-${i}-${Math.random().toString(36).slice(2, 10)}`,
      userId,
      characterId: `char-${Math.random().toString(36).slice(2, 10)}`,
      prompt: `A scene with the character doing activity ${i}`,
      status: ["COMPLETED", "FAILED", "PROCESSING"][i % 3],
      imageKey: i % 3 === 0 ? `generations/${userId}/gen-${i}/img.png` : null,
      errorMessage: null,
      createdAt,
      completedAt: i % 3 === 0 ? new Date(createdAt.getTime() + 5000) : null,
      character: { name: `Character ${i}` },
    });
  }
  return records;
}

// --- Tests ---

describe("Property 16: Generation history ordering and completeness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any user with generation records, history returns records sorted by createdAt descending with prompt, imageKey, characterName, and timestamp", async () => {
    const { getHistory } = await import("../../services/history.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 1, max: 20 }),
        async (userId, recordCount) => {
          vi.clearAllMocks();

          const sortedRecords = buildRecords(userId, recordCount);

          mockGenerationFindMany.mockResolvedValue(sortedRecords);
          mockGenerationCount.mockResolvedValue(recordCount);

          const result = await getHistory(userId, 1, 20);

          // All records are present
          expect(result.records.length).toBe(recordCount);
          expect(result.total).toBe(recordCount);

          // Records are sorted by createdAt descending
          for (let i = 1; i < result.records.length; i++) {
            expect(result.records[i - 1].createdAt.getTime())
              .toBeGreaterThanOrEqual(result.records[i].createdAt.getTime());
          }

          // Each record contains required fields
          for (const record of result.records) {
            expect(record.prompt).toBeTruthy();
            expect(typeof record.prompt).toBe("string");
            expect(typeof record.characterName).toBe("string");
            expect(record.characterName.length).toBeGreaterThan(0);
            expect(record.createdAt).toBeInstanceOf(Date);
            // imageKey can be null (for failed/processing generations)
            expect("imageKey" in record).toBe(true);
          }

          // Prisma was called with correct ordering
          expect(mockGenerationFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId },
              orderBy: { createdAt: "desc" },
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("history records map correctly from database records with character name included", async () => {
    const { getHistory } = await import("../../services/history.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 1, max: 10 }),
        async (userId, recordCount) => {
          vi.clearAllMocks();

          const sortedRecords = buildRecords(userId, recordCount);

          mockGenerationFindMany.mockResolvedValue(sortedRecords);
          mockGenerationCount.mockResolvedValue(recordCount);

          const result = await getHistory(userId);

          // Each returned record maps from the DB record correctly
          for (let i = 0; i < result.records.length; i++) {
            const dbRecord = sortedRecords[i];
            const historyRecord = result.records[i];

            expect(historyRecord.id).toBe(dbRecord.id);
            expect(historyRecord.prompt).toBe(dbRecord.prompt);
            expect(historyRecord.imageKey).toBe(dbRecord.imageKey);
            expect(historyRecord.characterName).toBe(dbRecord.character.name);
            expect(historyRecord.createdAt).toEqual(dbRecord.createdAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe("Property 17: Generation history pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any user with more than 20 records, default page returns exactly 20; for N <= 20 records returns N", async () => {
    const { getHistory } = await import("../../services/history.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 1, max: 50 }),
        async (userId, totalRecords) => {
          vi.clearAllMocks();

          const pageSize = 20;
          const expectedPageCount = Math.min(totalRecords, pageSize);

          const sortedPageRecords = buildRecords(userId, expectedPageCount);

          mockGenerationFindMany.mockResolvedValue(sortedPageRecords);
          mockGenerationCount.mockResolvedValue(totalRecords);

          const result = await getHistory(userId);

          // Default page size produces correct record count
          if (totalRecords > 20) {
            expect(result.records.length).toBe(20);
          } else {
            expect(result.records.length).toBe(totalRecords);
          }

          // Pagination metadata is correct
          expect(result.total).toBe(totalRecords);
          expect(result.page).toBe(1);
          expect(result.pageSize).toBe(20);

          // Prisma called with correct skip and take
          expect(mockGenerationFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
              skip: 0,
              take: 20,
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("for any valid page number, the correct offset is applied", async () => {
    const { getHistory } = await import("../../services/history.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 5, max: 50 }),
        async (userId, page, pageSize) => {
          vi.clearAllMocks();

          const totalRecords = page * pageSize + 10;
          const expectedSkip = (page - 1) * pageSize;
          const returnCount = Math.min(pageSize, totalRecords - expectedSkip);

          const sortedPageRecords = buildRecords(userId, returnCount);

          mockGenerationFindMany.mockResolvedValue(sortedPageRecords);
          mockGenerationCount.mockResolvedValue(totalRecords);

          const result = await getHistory(userId, page, pageSize);

          // Correct pagination metadata
          expect(result.page).toBe(page);
          expect(result.pageSize).toBe(pageSize);
          expect(result.total).toBe(totalRecords);

          // Prisma called with correct skip/take for the requested page
          expect(mockGenerationFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
              skip: expectedSkip,
              take: pageSize,
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("custom page sizes are respected in the query", async () => {
    const { getHistory } = await import("../../services/history.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 1, max: 100 }),
        async (userId, customPageSize) => {
          vi.clearAllMocks();

          const returnCount = Math.min(customPageSize, 10);
          const sortedRecords = buildRecords(userId, returnCount);

          mockGenerationFindMany.mockResolvedValue(sortedRecords);
          mockGenerationCount.mockResolvedValue(returnCount);

          const result = await getHistory(userId, 1, customPageSize);

          // The pageSize parameter is passed through
          expect(result.pageSize).toBe(customPageSize);

          // Prisma receives the custom page size
          expect(mockGenerationFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
              take: customPageSize,
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
