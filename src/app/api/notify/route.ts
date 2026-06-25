import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const { email, source } = body;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Valid email is required" } },
      { status: 400 }
    );
  }

  const normalizedSource = source === "credits_waitlist" ? source : "credits_waitlist";

  // TODO: replace with email service when ready
  console.log(`[WAITLIST] ${new Date().toISOString()} email=${email} source=${normalizedSource}`);

  await prisma.notifyRequest.create({
    data: { email, source: normalizedSource },
  });

  return NextResponse.json({ success: true });
}
