import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    // Validate required environment variables early
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error(
        "[register] Missing required Supabase environment variables:",
        {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
      );
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Registration failed. Please try again.",
          },
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid email or password. Password must be at least 8 characters.",
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const supabase = getSupabaseAdmin();

    // Create user in Supabase
    const { data: supabaseData, error: supabaseError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (supabaseError || !supabaseData.user) {
      console.error("[register] Supabase createUser failed:", supabaseError?.message);
      // Return uniform error message that doesn't reveal if email already exists
      return NextResponse.json(
        {
          error: {
            code: "REGISTRATION_FAILED",
            message: "Unable to create account. The email may already be in use, or please try again.",
          },
        },
        { status: 400 }
      );
    }

    // Create DB User record with 10 credits and an INITIAL_GRANT transaction
    let dbUser;
    try {
      dbUser = await prisma.user.create({
        data: {
          supabaseId: supabaseData.user.id,
          email,
          creditBalance: 10,
          transactions: {
            create: {
              amount: 10,
              type: "INITIAL_GRANT",
            },
          },
        },
      });
    } catch (dbError) {
      console.error("[register] Prisma user creation failed:", dbError instanceof Error ? dbError.message : dbError);
      // Attempt to clean up the Supabase user if DB creation fails
      await supabase.auth.admin.deleteUser(supabaseData.user.id).catch(() => {});
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Registration failed. Please try again.",
          },
        },
        { status: 500 }
      );
    }

    // Sign in the user to get a session
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: sessionData } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    return NextResponse.json(
      {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          creditBalance: dbUser.creditBalance,
        },
        session: sessionData.session
          ? {
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register] Unexpected error:", error instanceof Error ? error.message : error);
    // Return uniform error message
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Registration failed. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
