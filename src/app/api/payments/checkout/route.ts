import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth-helpers";
import { getPackById } from "../../../../lib/credit-packs";
import { razorpay, RAZORPAY_ENABLED } from "../../../../lib/razorpay";

/**
 * POST /api/payments/checkout — Create a Razorpay order for a credit pack purchase.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  if (!RAZORPAY_ENABLED || !razorpay) {
    return NextResponse.json(
      { error: { code: "PAYMENT_DISABLED", message: "Payments are not configured" } },
      { status: 503 }
    );
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 });
  }

  const pack = getPackById(body.packId);
  if (!pack) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid pack ID" } }, { status: 400 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: pack.pricePaise,
      currency: "INR",
      receipt: `rcpt_${user.id}_${pack.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        packId: pack.id,
        credits: String(pack.credits),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      packId: pack.id,
      credits: pack.credits,
    });
  } catch (error) {
    console.error("[checkout] Razorpay order creation error:", error);
    return NextResponse.json(
      { error: { code: "PAYMENT_ERROR", message: "Payment service unavailable." } },
      { status: 500 }
    );
  }
}
