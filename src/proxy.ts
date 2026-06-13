import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser } from "./lib/auth";
import { checkLimit } from "./lib/rate-limiter";

/**
 * Determines which rate limit endpoint category applies to a request path.
 */
function getRateLimitEndpoint(pathname: string): "generation" | "general" {
  if (pathname === "/api/generate") {
    return "generation";
  }
  return "general";
}

/**
 * Next.js 16 Proxy — validates JWT on protected routes, handles CORS preflight,
 * and applies rate limiting. Returns 401 for missing/invalid tokens, 429 when rate-limited.
 */
export async function proxy(request: NextRequest) {
  // Handle CORS preflight requests for API routes
  if (
    request.method === "OPTIONS" &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const user = await getAuthUser(request);

  if (!user) {
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

  // Apply rate limiting after auth validation
  const endpoint = getRateLimitEndpoint(request.nextUrl.pathname);

  // Always check general rate limit
  const generalResult = checkLimit(user.id, "general");
  if (!generalResult.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(generalResult.retryAfter) },
      }
    );
  }

  // For generation endpoint, also check generation-specific limit
  if (endpoint === "generation" && request.method === "POST") {
    const genResult = checkLimit(user.id, "generation");
    if (!genResult.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Generation rate limit exceeded. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(genResult.retryAfter) },
        }
      );
    }
  }

  // Pass the verified user info via headers for downstream route handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-email", user.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/api/characters/:path*",
    "/api/generate/:path*",
    "/api/generations/:path*",
    "/api/credits/:path*",
    "/api/auth/logout/:path*",
    "/api/images/:path*",
  ],
};
