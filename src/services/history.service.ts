import { prisma } from "../lib/db";

export interface HistoryRecord {
  id: string;
  prompt: string;
  imageKey: string | null;
  aspectRatio: string | null;
  characterName: string;
  status: string;
  createdAt: Date;
}

export interface PaginatedHistory {
  records: HistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Returns a user's generations ordered by createdAt DESC with pagination.
 * Includes prompt, imageKey, character name, and timestamp per record.
 */
export async function getHistory(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedHistory> {
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        character: { select: { name: true } },
      },
    }),
    prisma.generation.count({ where: { userId } }),
  ]);

  return {
    records: records.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      imageKey: r.imageKey,
      aspectRatio: r.aspectRatio,
      characterName: r.character.name,
      status: r.status,
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
