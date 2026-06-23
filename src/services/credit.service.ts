import { prisma } from "../lib/db";

/**
 * Gets the current credit balance for a user.
 */
export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  return user.creditBalance;
}

/**
 * Deducts 1 credit from the user's balance atomically.
 * Uses SELECT FOR UPDATE to prevent race conditions under concurrent requests.
 * Records a DEDUCTION transaction linked to the generation.
 *
 * Throws InsufficientCreditsError if balance < 1.
 */
export async function deduct(
  userId: string,
  generationId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Lock the user row for update to prevent concurrent deductions
    const rows = await tx.$queryRawUnsafe<{ credit_balance: number }[]>(
      `SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE`,
      userId
    );

    if (!rows || rows.length === 0) {
      throw new UserNotFoundError();
    }

    const balance = rows[0].credit_balance;

    if (balance < 1) {
      throw new InsufficientCreditsError();
    }

    // Decrement balance
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { decrement: 1 } },
    });

    // Record the transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        generationId,
        amount: -1,
        type: "DEDUCTION",
      },
    });
  });
}

/**
 * Refunds 1 credit to the user's balance atomically.
 * Records a REFUND transaction linked to the generation.
 */
export async function refund(
  userId: string,
  generationId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: 1 } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        generationId,
        amount: 1,
        type: "REFUND",
      },
    });
  });
}

/**
 * Gets the credit transaction history for a user, ordered by most recent first.
 */
export async function getTransactions(userId: string, limit: number = 20) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// --- Errors ---

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient credit balance");
    this.name = "InsufficientCreditsError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

/**
 * Adds credits after a completed payment. Idempotent via stripePaymentIntentId uniqueness.
 */
export async function addCredits(
  userId: string,
  credits: number,
  stripePaymentIntentId: string,
  packId: string,
  amountPaidCents: number
): Promise<void> {
  const existing = await prisma.purchaseRecord.findUnique({
    where: { stripePaymentIntentId },
  });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: credits } },
    });
    await tx.creditTransaction.create({
      data: { userId, amount: credits, type: "PURCHASE", generationId: null },
    });
    await tx.purchaseRecord.create({
      data: { userId, packId, stripePaymentIntentId, creditsAdded: credits, amountPaidCents },
    });
  });
}
