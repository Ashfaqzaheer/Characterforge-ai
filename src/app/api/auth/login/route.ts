import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid email or password.",
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      // Uniform error message for both wrong email and wrong password (Requirement 1.3)
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch {
    // Uniform error message — don't reveal details
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        },
      },
      { status: 401 }
    );
  }
}
