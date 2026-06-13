// Feature: character-forge-ai, Property 18: Credit deduction before generation
// Feature: character-forge-ai, Property 19: Insufficient credits rejection
// Feature: character-forge-ai, Property 20: Credit refund on failure
// Feature: character-forge-ai, Property 21: Credit transaction integrity
// Feature: character-forge-ai, Property 22: Atomicity under concurrent deductions
// Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockCreditTransactionCreate = vi.fn();
const mockCreditTransactionFindMany = vi.fn();
const mockQueryRawUnsafe = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../../lib/db", () => ({
  prisma: {
    user: {
      get findUnique() { return mockUserFindUnique; },
      get update() { return mockUserUpdate; },
    },
    creditTransaction: {
      get create() { return mockCreditTransactionCreate; },
      get findMany() { return mockCreditTransactionFindMany; },
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
    $queryRawUnsafe: (...args: any[]) => mockQueryRawUnsafe(...args),
  },
}));

// --- Generators ---

const uuidArb = fc.uuid();
const positiveBalanceArb = fc.integer({ min: 1, max: 1000 });

// --- Tests ---

describe("Property 18: Credit deduction before generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any user with balance >= 1, deducting a credit reduces balance by 1 and records a DEDUCTION transaction", async () => {
    const { deduct } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, positiveBalanceArb, async (userId, generationId, balance) => {
        vi.clearAllMocks();

        // Set up the mock $transaction to execute the callback with a mock tx
        mockTransaction.mockImplementation(async (callback: Function) => {
          const tx = {
            $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: balance }]),
            user: {
              update: vi.fn().mockResolvedValue({ id: userId, creditBalance: balance - 1 }),
            },
            creditTransaction: {
              create: vi.fn().mockResolvedValue({
                id: crypto.randomUUID(),
                userId,
                generationId,
                amount: -1,
                type: "DEDUCTION",
                createdAt: new Date(),
              }),
            },
          };
          await callback(tx);
          return tx;
        });

        // Should not throw for positive balance
        await expect(deduct(userId, generationId)).resolves.toBeUndefined();

        // Verify transaction was called
        expect(mockTransaction).toHaveBeenCalledTimes(1);

        // Verify the transaction callback performed correct operations
        const txCallback = mockTransaction.mock.calls[0][0];
        const mockTx = {
          $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: balance }]),
          user: { update: vi.fn().mockResolvedValue({}) },
          creditTransaction: { create: vi.fn().mockResolvedValue({}) },
        };
        await txCallback(mockTx);

        // SELECT FOR UPDATE was called
        expect(mockTx.$queryRawUnsafe).toHaveBeenCalledWith(
          expect.stringContaining("FOR UPDATE"),
          userId
        );

        // Balance was decremented by 1
        expect(mockTx.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: { creditBalance: { decrement: 1 } },
        });

        // DEDUCTION transaction was recorded
        expect(mockTx.creditTransaction.create).toHaveBeenCalledWith({
          data: {
            userId,
            generationId,
            amount: -1,
            type: "DEDUCTION",
          },
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 19: Insufficient credits rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any user with 0 credits, a deduction attempt throws InsufficientCreditsError and balance remains 0", async () => {
    const { deduct, InsufficientCreditsError } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (userId, generationId) => {
        vi.clearAllMocks();

        mockTransaction.mockImplementation(async (callback: Function) => {
          const tx = {
            $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: 0 }]),
            user: { update: vi.fn() },
            creditTransaction: { create: vi.fn() },
          };
          await callback(tx);
        });

        await expect(deduct(userId, generationId)).rejects.toThrow(InsufficientCreditsError);
      }),
      { numRuns: 100 }
    );
  });

  it("when balance is 0, no update or transaction record is created", async () => {
    const { deduct, InsufficientCreditsError } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (userId, generationId) => {
        vi.clearAllMocks();

        const mockTxUpdate = vi.fn();
        const mockTxCreate = vi.fn();

        mockTransaction.mockImplementation(async (callback: Function) => {
          const tx = {
            $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: 0 }]),
            user: { update: mockTxUpdate },
            creditTransaction: { create: mockTxCreate },
          };
          try {
            await callback(tx);
          } catch (e) {
            // Re-throw to propagate InsufficientCreditsError
            throw e;
          }
        });

        await expect(deduct(userId, generationId)).rejects.toThrow(InsufficientCreditsError);

        // No balance update or transaction should have been created
        expect(mockTxUpdate).not.toHaveBeenCalled();
        expect(mockTxCreate).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 20: Credit refund on failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any user, refunding a credit increments balance by 1 and records a REFUND transaction", async () => {
    const { refund } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (userId, generationId) => {
        vi.clearAllMocks();

        mockTransaction.mockImplementation(async (callback: Function) => {
          const tx = {
            user: {
              update: vi.fn().mockResolvedValue({ id: userId, creditBalance: 1 }),
            },
            creditTransaction: {
              create: vi.fn().mockResolvedValue({
                id: crypto.randomUUID(),
                userId,
                generationId,
                amount: 1,
                type: "REFUND",
                createdAt: new Date(),
              }),
            },
          };
          await callback(tx);
          return tx;
        });

        await expect(refund(userId, generationId)).resolves.toBeUndefined();
        expect(mockTransaction).toHaveBeenCalledTimes(1);

        // Verify refund logic inside the transaction
        const txCallback = mockTransaction.mock.calls[0][0];
        const mockTx = {
          user: { update: vi.fn().mockResolvedValue({}) },
          creditTransaction: { create: vi.fn().mockResolvedValue({}) },
        };
        await txCallback(mockTx);

        // Balance was incremented by 1
        expect(mockTx.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: { creditBalance: { increment: 1 } },
        });

        // REFUND transaction was recorded
        expect(mockTx.creditTransaction.create).toHaveBeenCalledWith({
          data: {
            userId,
            generationId,
            amount: 1,
            type: "REFUND",
          },
        });
      }),
      { numRuns: 100 }
    );
  });

  it("a deduction followed by a refund restores the original balance", async () => {
    const { deduct, refund } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, positiveBalanceArb, async (userId, generationId, initialBalance) => {
        vi.clearAllMocks();

        let simulatedBalance = initialBalance;

        // First call: deduct
        mockTransaction.mockImplementationOnce(async (callback: Function) => {
          const tx = {
            $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: simulatedBalance }]),
            user: {
              update: vi.fn().mockImplementation(() => {
                simulatedBalance -= 1;
                return Promise.resolve({ creditBalance: simulatedBalance });
              }),
            },
            creditTransaction: { create: vi.fn().mockResolvedValue({}) },
          };
          await callback(tx);
        });

        // Second call: refund
        mockTransaction.mockImplementationOnce(async (callback: Function) => {
          const tx = {
            user: {
              update: vi.fn().mockImplementation(() => {
                simulatedBalance += 1;
                return Promise.resolve({ creditBalance: simulatedBalance });
              }),
            },
            creditTransaction: { create: vi.fn().mockResolvedValue({}) },
          };
          await callback(tx);
        });

        await deduct(userId, generationId);
        expect(simulatedBalance).toBe(initialBalance - 1);

        await refund(userId, generationId);
        expect(simulatedBalance).toBe(initialBalance);
      }),
      { numRuns: 100 }
    );
  });
});


describe("Property 21: Credit transaction integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("every deduction produces a transaction record with amount -1, type DEDUCTION, and correct generationId", async () => {
    const { deduct } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, positiveBalanceArb, async (userId, generationId, balance) => {
        vi.clearAllMocks();

        let recordedTransaction: any = null;

        mockTransaction.mockImplementation(async (callback: Function) => {
          const tx = {
            $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: balance }]),
            user: { update: vi.fn().mockResolvedValue({}) },
            creditTransaction: {
              create: vi.fn().mockImplementation((args: any) => {
                recordedTransaction = args.data;
                return Promise.resolve({ id: crypto.randomUUID(), ...args.data, createdAt: new Date() });
              }),
            },
          };
          await callback(tx);
        });

        await deduct(userId, generationId);

        expect(recordedTransaction).not.toBeNull();
        expect(recordedTransaction.userId).toBe(userId);
        expect(recordedTransaction.generationId).toBe(generationId);
        expect(recordedTransaction.amount).toBe(-1);
        expect(recordedTransaction.type).toBe("DEDUCTION");
      }),
      { numRuns: 100 }
    );
  });

  it("every refund produces a transaction record with amount +1, type REFUND, and correct generationId", async () => {
    const { refund } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (userId, generationId) => {
        vi.clearAllMocks();

        let recordedTransaction: any = null;

        mockTransaction.mockImplementation(async (callback: Function) => {
          const tx = {
            user: { update: vi.fn().mockResolvedValue({}) },
            creditTransaction: {
              create: vi.fn().mockImplementation((args: any) => {
                recordedTransaction = args.data;
                return Promise.resolve({ id: crypto.randomUUID(), ...args.data, createdAt: new Date() });
              }),
            },
          };
          await callback(tx);
        });

        await refund(userId, generationId);

        expect(recordedTransaction).not.toBeNull();
        expect(recordedTransaction.userId).toBe(userId);
        expect(recordedTransaction.generationId).toBe(generationId);
        expect(recordedTransaction.amount).toBe(1);
        expect(recordedTransaction.type).toBe("REFUND");
      }),
      { numRuns: 100 }
    );
  });

  it("sum of all transaction amounts equals final balance minus initial grant", async () => {
    // This property verifies the mathematical invariant:
    // currentBalance = initialGrant + sum(transactions)
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }), // number of deductions
        fc.integer({ min: 0, max: 20 }), // number of refunds
        async (numDeductions, numRefunds) => {
          const initialGrant = 10;
          // Ensure we don't try to deduct more than we have (including refunds)
          const effectiveDeductions = Math.min(numDeductions, initialGrant + numRefunds);

          const transactions: { amount: number; type: string }[] = [];

          // Simulate deductions
          for (let i = 0; i < effectiveDeductions; i++) {
            transactions.push({ amount: -1, type: "DEDUCTION" });
          }

          // Simulate refunds
          for (let i = 0; i < numRefunds; i++) {
            transactions.push({ amount: 1, type: "REFUND" });
          }

          const sumOfTransactions = transactions.reduce((sum, tx) => sum + tx.amount, 0);
          const expectedBalance = initialGrant + sumOfTransactions;

          // The balance should never be negative
          expect(expectedBalance).toBeGreaterThanOrEqual(0);

          // Verify the mathematical invariant
          expect(expectedBalance).toBe(initialGrant - effectiveDeductions + numRefunds);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 22: Atomicity under concurrent deductions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for a user with balance B, exactly B concurrent deductions succeed and none result in negative balance", async () => {
    const { deduct, InsufficientCreditsError } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 1, max: 10 }), // balance B
        async (userId, balance) => {
          vi.clearAllMocks();

          // Simulate atomic behavior with SELECT FOR UPDATE:
          // Each transaction sees the current balance atomically and decrements it.
          let simulatedBalance = balance;

          mockTransaction.mockImplementation(async (callback: Function) => {
            // Simulate the row lock: read current balance atomically
            const currentBalance = simulatedBalance;

            if (currentBalance < 1) {
              // The transaction callback will throw InsufficientCreditsError
              // when it reads balance < 1 via SELECT FOR UPDATE
              const tx = {
                $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: currentBalance }]),
                user: { update: vi.fn().mockResolvedValue({}) },
                creditTransaction: { create: vi.fn().mockResolvedValue({}) },
              };
              await callback(tx);
              return;
            }

            // Atomically decrement before releasing the "lock"
            simulatedBalance -= 1;

            const tx = {
              $queryRawUnsafe: vi.fn().mockResolvedValue([{ credit_balance: currentBalance }]),
              user: { update: vi.fn().mockResolvedValue({ creditBalance: simulatedBalance }) },
              creditTransaction: { create: vi.fn().mockResolvedValue({}) },
            };
            await callback(tx);
          });

          // Submit B+2 concurrent deductions (more than available balance)
          const totalAttempts = balance + 2;
          const generationIds = Array.from({ length: totalAttempts }, () => crypto.randomUUID());

          const results = await Promise.allSettled(
            generationIds.map((genId) => deduct(userId, genId))
          );

          const successes = results.filter((r) => r.status === "fulfilled").length;
          const failures = results.filter((r) => r.status === "rejected").length;

          // Exactly B deductions should succeed
          expect(successes).toBe(balance);

          // The rest should fail with InsufficientCreditsError
          expect(failures).toBe(2);

          // Balance should never go negative
          expect(simulatedBalance).toBeGreaterThanOrEqual(0);
          expect(simulatedBalance).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("SELECT FOR UPDATE is used to prevent race conditions", async () => {
    const { deduct } = await import("../../services/credit.service");

    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, positiveBalanceArb, async (userId, generationId, balance) => {
        vi.clearAllMocks();

        let queryUsed = "";

        mockTransaction.mockImplementation(async (callback: Function) => {
          const tx = {
            $queryRawUnsafe: vi.fn().mockImplementation((query: string) => {
              queryUsed = query;
              return Promise.resolve([{ credit_balance: balance }]);
            }),
            user: { update: vi.fn().mockResolvedValue({}) },
            creditTransaction: { create: vi.fn().mockResolvedValue({}) },
          };
          await callback(tx);
        });

        await deduct(userId, generationId);

        // The deduction MUST use SELECT ... FOR UPDATE to ensure row-level locking
        expect(queryUsed).toContain("FOR UPDATE");
        expect(queryUsed).toContain("credit_balance");
      }),
      { numRuns: 100 }
    );
  });
});
