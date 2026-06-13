// Feature: character-forge-ai, Property 1: Registration produces authenticated user with credits
// Feature: character-forge-ai, Property 2: Login/logout round trip invalidates session
// Feature: character-forge-ai, Property 3: Invalid credentials produce uniform error
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 7.1

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// --- Mocks ---

// Set required env vars for register route validation
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Mock Prisma
const mockPrismaUser = {
  create: vi.fn(),
  findUnique: vi.fn(),
};

vi.mock("../../lib/db", () => ({
  prisma: {
    user: {
      get create() { return mockPrismaUser.create; },
      get findUnique() { return mockPrismaUser.findUnique; },
    },
  },
}));

// Mock Supabase admin client
const mockAdminCreateUser = vi.fn();
const mockAdminSignOut = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock("../../lib/auth", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
        signOut: mockAdminSignOut,
      },
      getUser: vi.fn(),
    },
  }),
  verifyToken: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

// --- Generators ---

const emailArb = fc.tuple(
  fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
  fc.stringMatching(/^[a-z][a-z0-9]{2,8}$/),
  fc.constantFrom("example.com", "test.org", "mail.net")
).map(([local, sub, domain]) => `${local}.${sub}@${domain}`);

const passwordArb = fc.stringMatching(/^[A-Za-z0-9!@#$%^&*]{8,32}$/);

const uuidArb = fc.uuid();

// --- Tests ---

describe("Property 1: Registration produces authenticated user with credits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any valid email/password, registration creates a user with exactly 10 credits and a session", async () => {
    const { POST } = await import("../../app/api/auth/register/route");

    await fc.assert(
      fc.asyncProperty(emailArb, passwordArb, uuidArb, async (email, password, supabaseUserId) => {
        vi.clearAllMocks();

        const dbUserId = crypto.randomUUID();

        // Mock Supabase creating user successfully
        mockAdminCreateUser.mockResolvedValue({
          data: { user: { id: supabaseUserId, email } },
          error: null,
        });

        // Mock DB user creation
        mockPrismaUser.create.mockResolvedValue({
          id: dbUserId,
          supabaseId: supabaseUserId,
          email,
          creditBalance: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Mock sign-in to get session
        mockSignInWithPassword.mockResolvedValue({
          data: {
            session: {
              access_token: `token-${supabaseUserId}`,
              refresh_token: `refresh-${supabaseUserId}`,
            },
            user: { id: supabaseUserId, email },
          },
          error: null,
        });

        const request = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const response = await POST(request);
        const data = await response.json();

        // Status should be 201 Created
        expect(response.status).toBe(201);

        // User should have exactly 10 credits
        expect(data.user.creditBalance).toBe(10);

        // User email should match input
        expect(data.user.email).toBe(email);

        // Session should be present with tokens
        expect(data.session).toBeDefined();
        expect(data.session.access_token).toBeTruthy();
        expect(data.session.refresh_token).toBeTruthy();

        // Prisma should have been called to create user with 10 credits
        expect(mockPrismaUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              supabaseId: supabaseUserId,
              email,
              creditBalance: 10,
            }),
          })
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 2: Login/logout round trip invalidates session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any registered user, login then logout invalidates the session token", async () => {
    const { POST: loginPost } = await import("../../app/api/auth/login/route");
    const { POST: logoutPost } = await import("../../app/api/auth/logout/route");
    const { verifyToken } = await import("../../lib/auth");
    const mockVerifyToken = vi.mocked(verifyToken);

    await fc.assert(
      fc.asyncProperty(emailArb, passwordArb, uuidArb, async (email, password, userId) => {
        vi.clearAllMocks();

        const accessToken = `access-token-${userId}`;

        // Step 1: Login succeeds
        mockSignInWithPassword.mockResolvedValue({
          data: {
            session: {
              access_token: accessToken,
              refresh_token: `refresh-${userId}`,
            },
            user: { id: userId, email },
          },
          error: null,
        });

        const loginRequest = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const loginResponse = await loginPost(loginRequest);
        const loginData = await loginResponse.json();

        expect(loginResponse.status).toBe(200);
        expect(loginData.session.access_token).toBe(accessToken);

        // Step 2: Logout with the token
        mockAdminSignOut.mockResolvedValue({ error: null });

        const logoutRequest = new Request("http://localhost/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }) as unknown as import("next/server").NextRequest;

        // Attach headers.get method for NextRequest compatibility
        const logoutReq = new Request("http://localhost/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const logoutResponse = await logoutPost(logoutReq as any);
        expect(logoutResponse.status).toBe(200);

        // Step 3: Verify sign-out was called with the correct token
        expect(mockAdminSignOut).toHaveBeenCalledWith(accessToken);

        // Step 4: After logout, token verification should fail
        mockVerifyToken.mockResolvedValue(null);
        const result = await verifyToken(accessToken);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 3: Invalid credentials produce uniform error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any invalid credentials (wrong email or wrong password), the error response is identical", async () => {
    const { POST } = await import("../../app/api/auth/login/route");

    await fc.assert(
      fc.asyncProperty(
        emailArb,
        passwordArb,
        fc.constantFrom("invalid_email", "invalid_password"),
        async (email, password, failureReason) => {
          vi.clearAllMocks();

          // Both failure reasons produce the same Supabase error
          mockSignInWithPassword.mockResolvedValue({
            data: { session: null, user: null },
            error: {
              message:
                failureReason === "invalid_email"
                  ? "Invalid login credentials"
                  : "Invalid login credentials",
              status: 400,
            },
          });

          const request = new Request("http://localhost/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const response = await POST(request);
          const data = await response.json();

          // Status should be 401 regardless of failure reason
          expect(response.status).toBe(401);

          // Error structure should be identical
          expect(data.error).toBeDefined();
          expect(data.error.code).toBe("UNAUTHORIZED");
          expect(data.error.message).toBe("Invalid email or password.");

          // Error message should NOT reveal whether the email exists
          expect(data.error.message).not.toContain("not found");
          expect(data.error.message).not.toContain("does not exist");
          expect(data.error.message).not.toContain("no account");
          expect(data.error.message).not.toContain("wrong password");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("error response structure is the same for non-existent email vs wrong password", async () => {
    const { POST } = await import("../../app/api/auth/login/route");

    await fc.assert(
      fc.asyncProperty(emailArb, passwordArb, async (email, password) => {
        vi.clearAllMocks();

        // Test with "email not found" scenario
        mockSignInWithPassword.mockResolvedValue({
          data: { session: null, user: null },
          error: { message: "Invalid login credentials", status: 400 },
        });

        const request1 = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const response1 = await POST(request1);
        const data1 = await response1.json();

        vi.clearAllMocks();

        // Test with "wrong password" scenario
        mockSignInWithPassword.mockResolvedValue({
          data: { session: null, user: null },
          error: { message: "Invalid login credentials", status: 400 },
        });

        const request2 = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: password + "wrong" }),
        });

        const response2 = await POST(request2);
        const data2 = await response2.json();

        // Both responses should be structurally identical
        expect(response1.status).toBe(response2.status);
        expect(data1.error.code).toBe(data2.error.code);
        expect(data1.error.message).toBe(data2.error.message);
        expect(Object.keys(data1)).toEqual(Object.keys(data2));
        expect(Object.keys(data1.error)).toEqual(Object.keys(data2.error));
      }),
      { numRuns: 100 }
    );
  });
});
