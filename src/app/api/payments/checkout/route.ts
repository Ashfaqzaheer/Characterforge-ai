import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth-helpers";
import { getPackById } from "../../../../lib/credit-packs";
import { stripe, STRIPE_ENABLED } from "../../../../lib/stripe";
import { addCredits } from "../../../../services/credit.service";
import { prisma } from "../../../../lib/db";

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

  const pack = getPackById(body.packId);
  if (!pack) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid pack ID" } }, { status: 400 });
  }

  if (STRIPE_ENABLED && stripe) {
    try {
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
        stripeCustomerId = customer.id;
        await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
      }

      const priceId = process.env[pack.stripePriceEnvVar];
      if (!priceId) {
        return NextResponse.json({ error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe price not configured" } }, { status: 500 });
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?payment=success&pack=${pack.id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?payment=cancelled`,
        metadata: { userId: user.id, packId: pack.id },
      });

      return NextResponse.json({ url: session.url, mode: "stripe" });
    } catch (error) {
      console.error("[checkout] Stripe error:", error);
      return NextResponse.json({ error: { code: "PAYMENT_ERROR", message: "Payment service unavailable." } }, { status: 500 });
    }
  }

  // Mock mode — instant credit top-up
  await addCredits(user.id, pack.credits, `mock_${user.id}_${pack.id}_${Date.now()}`, pack.id, pack.priceCents);
  return NextResponse.json({ url: `/dashboard?payment=success&pack=${pack.id}&mock=true`, mode: "mock" });
}
