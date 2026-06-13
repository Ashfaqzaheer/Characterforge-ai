import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth-helpers";
import { getBalance, getTransactions } from "../../../services/credit.service";

/**
 * GET /api/credits — Returns the authenticated user's credit balance and recent transactions.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const [balance, transactions] = await Promise.all([
      getBalance(user.id),
      getTransactions(user.id),
    ]);

    return NextResponse.json({ balance, transactions });
  } catch (error) {
    console.error("Unexpected error in GET /api/credits:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
