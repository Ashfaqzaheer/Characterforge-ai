import { NextResponse } from "next/server";
import { STRIPE_ENABLED } from "../../../../lib/stripe";

export async function GET() {
  return NextResponse.json({ mockMode: !STRIPE_ENABLED, stripeEnabled: STRIPE_ENABLED });
}
