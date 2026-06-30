import { NextResponse } from "next/server";
import { RAZORPAY_ENABLED } from "../../../../lib/razorpay";

export async function GET() {
  return NextResponse.json({ razorpayEnabled: RAZORPAY_ENABLED });
}
