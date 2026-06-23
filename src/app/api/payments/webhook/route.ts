import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_ENABLED } from "../../../../lib/stripe";
import { getPackById } from "../../../../lib/credit-packs";
import { addCredits } from "../../../../services/credit.service";

export async function POST(request: NextRequest) {
  if (!STRIPE_ENABLED || !stripe) {
    return NextResponse.json({ received: true });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const packId = session.metadata?.packId;
    const paymentIntentId = session.payment_intent as string;
    const pack = getPackById(packId ?? "");

    if (userId && pack && paymentIntentId) {
      await addCredits(userId, pack.credits, paymentIntentId, pack.id, session.amount_total ?? pack.priceCents);
    }
  }

  return NextResponse.json({ received: true });
}
