// Feature: character-forge-ai, Property 28: Authentication required on protected routes
// Feature: character-forge-ai, Property 29: Input validation rejects malformed data
// Validates: Requirements 10.1, 10.4, 10.5

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// --- Mocks ---

// Mock Supabase auth
vi.mock("../../lib/auth", () => ({
  verifyToken: vi.fn(),
  getAuthUser: vi.fn(),
  getSupabaseAdmin: () => ({
    auth: {
      admin: { signOut: vi.fn().mockResolvedValue({ error: null }) },
      getUser: vi.fn(),
    },
  }),
}));

// Mock Prisma
const mockPrismaUser = {
  findUnique: vi.fn(),
};
const mockPrismaCharacter = {
  findMany: vi.fn(),
  create: vi.fn(),
};
const mockPrismaGeneration = {
  findMany: vi.fn(),
  count: vi.fn(),
};
const mockPrismaCreditTransaction = {
  findMany: vi.fn(),
};

vi.mock("../../lib/db", () => ({
  prisma: {
    user: { get findUnique() { return mockPrismaUser.findUnique; } },
    character: {
      get findMany() { return mockPrismaCharacter.findMany; },
      get create() { return mockPrismaCharacter.create; },
    },
    generation: {
      get findMany() { return mockPrismaGeneration.findMany; },
      get count() { return mockPrismaGeneration.count; },
    },
    creditTransaction: {
      get findMany() { return mockPrismaCreditTransaction.findMany; },
    },
  },
}));

// Mock rate limiter
vi.mock("../../lib/rate-limiter", () => ({
  checkLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

// --- Generators ---

const protectedRoutes = [
  { path: "/api/characters", method: "GET" },
  { path: "/api/characters", method: "POST" },
  { path: "/api/generate", method: "POST" },
  { path: "/api/generations", method: "GET" },
  { path: "/api/credits", method: "GET" },
] as const;

const protectedRouteArb = fc.constantFrom(...protectedRoutes);

const invalidTokenArb = fc.oneof(
  fc.constant(""),              // empty string
  fc.constant("invalid-jwt"),   // gibberish
  fc.stringMatching(/^[a-z0-9]{10,40}$/), // random alphanumeric
  fc.constant("eyJhbGciOiJIUzI1NiJ9.invalid.payload"), // malformed JWT
);

const invalidAuthHeaderArb = fc.oneof(
  fc.constant(null),             // no header at all
  fc.constant(""),               // empty header
  fc.constant("Basic dXNlcjpwYXNz"), // wrong scheme
  invalidTokenArb.map(t => `Bearer ${t}`), // Bearer with invalid token
);

// Generators for malformed character input
const malformedCharacterInputArb = fc.oneof(
  // Name too long (>100 chars)
  fc.record({
    name: fc.string({ minLength: 101, maxLength: 200 }),
    description: fc.string({ minLength: 1, maxLength: 1000 }),
  }),
  // Name empty
  fc.record({
    name: fc.constant(""),
    description: fc.string({ minLength: 1, maxLength: 1000 }),
  }),
  // Description too long (>1000 chars)
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 1001, maxLength: 1500 }),
  }),
  // Description empty
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.constant(""),
  }),
  // Missing name field
  fc.record({
    description: fc.string({ minLength: 1, maxLength: 1000 }),
  }),
  // Missing description field
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
  }),
  // Wrong types
  fc.record({
    name: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)) as fc.Arbitrary<any>,
    description: fc.string({ minLength: 1, maxLength: 1000 }),
  }),
  // Completely empty object
  fc.constant({}),
  // Array instead of object
  fc.constant([]),
  // Null
  fc.constant(null),
);

// Generators for malformed generation input
const malformedGenerationInputArb = fc.oneof(
  // Prompt too long (>500 chars)
  fc.record({
    characterId: fc.uuid(),
    prompt: fc.string({ minLength: 501, maxLength: 700 }),
  }),
  // Prompt empty
  fc.record({
    characterId: fc.uuid(),
    prompt: fc.constant(""),
  }),
  // Missing characterId
  fc.record({
    prompt: fc.string({ minLength: 1, maxLength: 500 }),
  }),
  // Missing prompt
  fc.record({
    characterId: fc.uuid(),
  }),
  // CharacterId empty string
  fc.record({
    characterId: fc.constant(""),
    prompt: fc.string({ minLength: 1, maxLength: 500 }),
  }),
  // Wrong types
  fc.record({
    characterId: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)) as fc.Arbitrary<any>,
    prompt: fc.integer() as fc.Arbitrary<any>,
  }),
  // Empty object
  fc.constant({}),
  // Null
  fc.constant(null),
);

// --- Tests ---

describe("Property 28: Authentication required on protected routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any protected route, a request without a valid auth token returns 401 and never executes business logic", async () => {
    const { getAuthUser } = await import("../../lib/auth");
    const mockGetAuthUser = vi.mocked(getAuthUser);

    await fc.assert(
      fc.asyncProperty(
        protectedRouteArb,
        invalidAuthHeaderArb,
        async (route, authHeader) => {
          vi.clearAllMocks();

          // Simulate auth failure — getAuthUser returns null for invalid tokens
          mockGetAuthUser.mockResolvedValue(null);

          // Import the proxy which handles auth for all protected routes
          const { proxy } = await import("../../proxy");

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (authHeader !== null && authHeader !== "") {
            headers["Authorization"] = authHeader;
          }

          // Create a mock NextRequest
          const url = `http://localhost${route.path}`;
          const request = new Request(url, {
            method: route.method,
            headers,
            ...(route.method === "POST"
              ? { body: JSON.stringify({ name: "test", description: "test" }) }
              : {}),
          }) as any;

          // Add NextRequest-compatible properties
          request.nextUrl = new URL(url);

          const response = await proxy(request);

          // Should always return 401
          expect(response.status).toBe(401);

          const data = await response.json();
          expect(data.error).toBeDefined();
          expect(data.error.code).toBe("UNAUTHORIZED");
          expect(data.error.message).toBeDefined();
          expect(typeof data.error.message).toBe("string");

          // Business logic mocks should NOT have been called
          expect(mockPrismaCharacter.findMany).not.toHaveBeenCalled();
          expect(mockPrismaCharacter.create).not.toHaveBeenCalled();
          expect(mockPrismaGeneration.findMany).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("error response for unauthenticated requests never contains internal details", async () => {
    const { getAuthUser } = await import("../../lib/auth");
    const mockGetAuthUser = vi.mocked(getAuthUser);

    await fc.assert(
      fc.asyncProperty(protectedRouteArb, async (route) => {
        vi.clearAllMocks();
        mockGetAuthUser.mockResolvedValue(null);

        const { proxy } = await import("../../proxy");

        const url = `http://localhost${route.path}`;
        const request = new Request(url, {
          method: route.method,
          headers: { "Content-Type": "application/json" },
          ...(route.method === "POST"
            ? { body: JSON.stringify({}) }
            : {}),
        }) as any;
        request.nextUrl = new URL(url);

        const response = await proxy(request);
        const data = await response.json();

        const responseText = JSON.stringify(data);

        // Response must not contain internal details
        expect(responseText).not.toContain("stack");
        expect(responseText).not.toContain("SUPABASE");
        expect(responseText).not.toContain("service_role");
        expect(responseText).not.toContain("DATABASE_URL");
        expect(responseText).not.toContain("REPLICATE");
        expect(responseText.toLowerCase()).not.toContain("api_key");
        expect(responseText.toLowerCase()).not.toContain("secret");
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 29: Input validation rejects malformed data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("for any malformed character creation input, the API returns 400 without processing", async () => {
    const { POST } = await import("../../app/api/characters/route");
    const { verifyToken } = await import("../../lib/auth");
    const mockVerifyToken = vi.mocked(verifyToken);

    await fc.assert(
      fc.asyncProperty(malformedCharacterInputArb, async (malformedInput) => {
        vi.clearAllMocks();

        // Auth succeeds (user is authenticated)
        mockVerifyToken.mockResolvedValue({
          id: "supabase-user-id",
          email: "user@example.com",
        });

        mockPrismaUser.findUnique.mockResolvedValue({
          id: "db-user-id",
          supabaseId: "supabase-user-id",
          email: "user@example.com",
          creditBalance: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request = new Request("http://localhost/api/characters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
            "x-user-id": "db-user-id",
            "x-user-email": "user@example.com",
          },
          body: JSON.stringify(malformedInput),
        }) as any;

        const response = await POST(request);

        // Should return 400 for validation failure
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe("VALIDATION_ERROR");
        expect(data.error.message).toBeDefined();
        expect(typeof data.error.message).toBe("string");

        // Character should NOT have been created
        expect(mockPrismaCharacter.create).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it("for any malformed generation input, the API returns 400 without processing", async () => {
    const { POST } = await import("../../app/api/generate/route");
    const { verifyToken } = await import("../../lib/auth");
    const mockVerifyToken = vi.mocked(verifyToken);

    await fc.assert(
      fc.asyncProperty(malformedGenerationInputArb, async (malformedInput) => {
        vi.clearAllMocks();

        // Auth succeeds
        mockVerifyToken.mockResolvedValue({
          id: "supabase-user-id",
          email: "user@example.com",
        });

        mockPrismaUser.findUnique.mockResolvedValue({
          id: "db-user-id",
          supabaseId: "supabase-user-id",
          email: "user@example.com",
          creditBalance: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request = new Request("http://localhost/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
            "x-user-id": "db-user-id",
            "x-user-email": "user@example.com",
          },
          body: JSON.stringify(malformedInput),
        }) as any;

        const response = await POST(request);

        // Should return 400 for validation failure
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe("VALIDATION_ERROR");
        expect(data.error.message).toBeDefined();
        expect(typeof data.error.message).toBe("string");

        // Error should not reveal internal details
        const responseText = JSON.stringify(data);
        expect(responseText).not.toContain("stack");
        expect(responseText).not.toContain("prisma");
        expect(responseText.toLowerCase()).not.toContain("api_key");
      }),
      { numRuns: 100 }
    );
  });

  it("validation errors have consistent structure regardless of input shape", async () => {
    const { validateInput } = await import("../../lib/validation");
    const { createCharacterSchema, generateSchema } = await import("../../lib/validation");

    const allMalformedInputs = fc.oneof(
      malformedCharacterInputArb,
      malformedGenerationInputArb
    );

    await fc.assert(
      fc.property(allMalformedInputs, (malformedInput) => {
        // Test character schema validation
        const charResult = validateInput(createCharacterSchema, malformedInput);
        if (!charResult.success) {
          expect(charResult.message).toBeDefined();
          expect(typeof charResult.message).toBe("string");
          expect(charResult.message.length).toBeGreaterThan(0);
          // Message must not contain internal error implementation details
          expect(charResult.message).not.toContain("TypeError");
          expect(charResult.message).not.toContain("ReferenceError");
          expect(charResult.message).not.toContain("at Object");
        }

        // Test generation schema validation
        const genResult = validateInput(generateSchema, malformedInput);
        if (!genResult.success) {
          expect(genResult.message).toBeDefined();
          expect(typeof genResult.message).toBe("string");
          expect(genResult.message.length).toBeGreaterThan(0);
          // Message must not contain internal error implementation details
          expect(genResult.message).not.toContain("TypeError");
          expect(genResult.message).not.toContain("ReferenceError");
          expect(genResult.message).not.toContain("at Object");
        }
      }),
      { numRuns: 100 }
    );
  });
});
