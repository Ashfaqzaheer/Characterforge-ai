"use client";

import { getSupabaseBrowser } from "./supabase-browser";

/**
 * Wrapper around fetch that attaches the Supabase session token.
 * Redirects to /login on 401 (session expired).
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await getSupabaseBrowser().auth.getSession();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    // Session expired — redirect to login
    window.location.href = "/login";
  }

  return res;
}
