import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    // The proxy has already verified the JWT and set x-user-id header.
    // Extract the token from the Authorization header to sign out.
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid authentication token",
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const supabase = getSupabaseAdmin();

    // Sign out the user using admin API
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Logout failed. Please try again.",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Successfully logged out" });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Logout failed. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
