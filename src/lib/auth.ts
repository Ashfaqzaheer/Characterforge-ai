import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client using service role key.
 * Used for token verification and admin operations.
 */
function getSupabaseAdmin(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface VerifiedUser {
  id: string; // Supabase user ID
  email: string;
}

/**
 * Verifies a Supabase JWT token and returns the user data.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<VerifiedUser | null> {
  const supabase = getSupabaseAdmin();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
  };
}

/**
 * Extracts the Bearer token from the Authorization header and verifies it.
 * Returns the verified user or null if authentication fails.
 */
export async function getAuthUser(
  request: NextRequest
): Promise<VerifiedUser | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export { getSupabaseAdmin };
