import type { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { prisma } from "./db";
import type { User } from "../generated/prisma/client";

/**
 * Gets the authenticated user from the request.
 * Extracts the token, verifies with Supabase, and looks up the user in the DB.
 * Returns the full DB user record or null if authentication fails.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<User | null> {
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

  // Look up the user in the database by their Supabase ID
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: verifiedUser.id },
  });

  return dbUser;
}
