import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthenticatedUser } from "../../../../lib/auth-helpers";
import { getPackById } from "../../../../lib/credit-packs";
import { addCredits } from "../../../../services/credit.service";
import { prisma } from "../../../../lib/db";

/**
 * POST /api/payments/verify — Verify Razorpay payment signature and add credits.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packId } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Missing required payment fields" } },
      { status: 400 }
    );
  }

  const pack = getPackById(packId);
  if (!pack) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid pack ID" } },
      { status: 400 }
    );
  }

  // Verify HMAC SHA256 signature
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Payment verification unavailable" } },
      { status: 500 }
    );
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json(
      { error: { code: "PAYMENT_VERIFICATION_FAILED", message: "Invalid payment signature" } },
      { status: 400 }
    );
  }

  // Prevent duplicate credit additions
  const existingPurchase = await prisma.purchaseRecord.findUnique({
    where: { stripePaymentIntentId: razorpay_payment_id },
  });

  if (existingPurchase) {
    // Already processed — return success without adding credits again
    return NextResponse.json({ success: true, credits: pack.credits, duplicate: true });
  }

  // Add credits
  await addCredits(
    user.id,
    pack.credits,
    razorpay_payment_id,
    pack.id,
    pack.pricePaise
  );

  return NextResponse.json({ success: true, credits: pack.credits });
}
