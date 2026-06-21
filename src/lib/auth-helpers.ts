import type { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { prisma } from "./db";
import type { User } from "../generated/prisma/client";

/**
 * Gets the authenticated user from the request.
 *
 * Fast path: If x-user-id header is present (set by proxy.ts after successful
 * Supabase JWT verification), uses it directly for the DB lookup — skipping a
 * redundant second Supabase auth.getUser() call.
 *
 * SECURITY NOTE: x-user-id cannot be spoofed by clients because:
 * 1. Next.js proxy (middleware) always runs before route handlers.
 * 2. proxy.ts's config.matcher covers ALL protected API routes.
 * 3. proxy.ts sets fresh request headers via NextResponse.next({ request: { headers } }),
 *    which replaces any client-supplied x-user-id on the forwarded internal request.
 * Therefore these headers are trusted internal-only values.
 *
 * Fallback path: If x-user-id is absent (test environments calling route handlers
 * directly, or routes not in the proxy matcher), falls back to the original behavior:
 * extract Bearer token → verifyToken() via Supabase → DB lookup.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<User | null> {
  // Fast path: proxy already verified the JWT and set the Supabase user ID
  const proxyUserId = request.headers.get("x-user-id");

  if (proxyUserId) {
    // x-user-id from proxy.ts is the Supabase user ID — look up DB user directly
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: proxyUserId },
    });
    return dbUser;
  }

  // Fallback path: no proxy header — verify token manually (test environments, etc.)
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  if (!token) {
    return null;
  }

  const verifiedUser = await verifyToken(token);

  if (!verifiedUser) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: verifiedUser.id },
  });

  return dbUser;
}
