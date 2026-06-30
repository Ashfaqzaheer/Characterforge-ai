import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPackById } from "../../../../lib/credit-packs";
import { addCredits } from "../../../../services/credit.service";

/**
 * POST /api/payments/webhook — Razorpay webhook for payment.captured events.
 * Verifies signature and adds credits as a fallback to client-side verification.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ received: true });
  }

  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(body); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (!payment) return NextResponse.json({ received: true });

    const notes = payment.notes || {};
    const userId = notes.userId;
    const packId = notes.packId;
    const paymentId = payment.id;
    const pack = getPackById(packId ?? "");

    if (userId && pack && paymentId) {
      // addCredits is idempotent — won't add twice for same paymentId
      await addCredits(userId, pack.credits, paymentId, pack.id, payment.amount ?? pack.pricePaise);
    }
  }

  return NextResponse.json({ received: true });
}
