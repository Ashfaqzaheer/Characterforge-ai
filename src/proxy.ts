import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUser } from "./lib/auth";
import { checkLimit, checkLimitByKey } from "./lib/rate-limiter";

/** Public auth routes that need rate limiting but NOT authentication */
const PUBLIC_AUTH_ROUTES = ["/api/auth/login", "/api/auth/register"];

/**
 * Extracts client IP from request headers.
 * Trusts x-forwarded-for set by the platform's reverse proxy (Vercel, Cloudflare, etc).
 * NOTE: If self-hosting behind a different reverse proxy, ensure x-forwarded-for is
 * stripped/overwritten at the edge to prevent IP spoofing.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

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
        "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const pathname = request.nextUrl.pathname;

  // --- Public payment routes: no auth required ---
  const PUBLIC_PAYMENT_ROUTES = ["/api/payments/webhook", "/api/payments/status"];
  if (PUBLIC_PAYMENT_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // --- Public auth routes: rate limit by IP only, no auth required ---
  if (PUBLIC_AUTH_ROUTES.includes(pathname) && request.method === "POST") {
    const ip = getClientIp(request);
    const endpoint = pathname === "/api/auth/login" ? "auth-login" : "auth-register";
    const key = `ip:${ip}:${endpoint}`;

    const result = await checkLimitByKey(key, endpoint);
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many attempts. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfter) },
        }
      );
    }

    // Allow the request to proceed (no auth check for public routes)
    return NextResponse.next();
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
  const generalResult = await checkLimit(user.id, "general");
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
    const genResult = await checkLimit(user.id, "generation");
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
    "/api/auth/login",
    "/api/auth/register",
    "/api/characters/:path*",
    "/api/generate/:path*",
    "/api/generations/:path*",
    "/api/credits/:path*",
    "/api/auth/logout/:path*",
    "/api/images/:path*",
    "/api/payments/:path*",
  ],
};
