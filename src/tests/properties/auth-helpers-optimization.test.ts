// Feature: character-forge-ai — redundant Supabase auth call removal
// Tests: fast path (x-user-id header) skips verifyToken; fallback path still works

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyToken = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("../../lib/auth", () => ({
  get verifyToken() { return mockVerifyToken; },
  getSupabaseAdmin: vi.fn(),
  getAuthUser: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  prisma: {
    user: {
      get findUnique() { return mockUserFindUnique; },
    },
  },
}));

describe("getAuthenticatedUser optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fast path: when x-user-id header is present, verifyToken is NOT called — only DB lookup", async () => {
    const { getAuthenticatedUser } = await import("../../lib/auth-helpers");

    const mockUser = { id: "db-user-1", supabaseId: "sup-123", email: "test@example.com", creditBalance: 10 };
    mockUserFindUnique.mockResolvedValue(mockUser);

    const request = new Request("http://localhost/api/characters", {
      method: "GET",
      headers: {
        "x-user-id": "sup-123",
        "x-user-email": "test@example.com",
        "Authorization": "Bearer some-token",
      },
    });

    const result = await getAuthenticatedUser(request as any);

    // verifyToken should NOT be called (fast path)
    expect(mockVerifyToken).not.toHaveBeenCalled();

    // DB lookup should use the supabaseId from the header
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { supabaseId: "sup-123" } });

    expect(result).toEqual(mockUser);
  });

  it("fallback path: when x-user-id header is absent, verifyToken IS called", async () => {
    const { getAuthenticatedUser } = await import("../../lib/auth-helpers");

    const mockUser = { id: "db-user-2", supabaseId: "sup-456", email: "user@example.com", creditBalance: 5 };
    mockVerifyToken.mockResolvedValue({ id: "sup-456", email: "user@example.com" });
    mockUserFindUnique.mockResolvedValue(mockUser);

    const request = new Request("http://localhost/api/characters", {
      method: "GET",
      headers: {
        "Authorization": "Bearer valid-token",
      },
    });

    const result = await getAuthenticatedUser(request as any);

    // verifyToken SHOULD be called (fallback path)
    expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");

    // DB lookup should use the verified supabaseId
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { supabaseId: "sup-456" } });

    expect(result).toEqual(mockUser);
  });

  it("fallback path: returns null when no Authorization header and no x-user-id", async () => {
    const { getAuthenticatedUser } = await import("../../lib/auth-helpers");

    const request = new Request("http://localhost/api/characters", { method: "GET" });

    const result = await getAuthenticatedUser(request as any);

    expect(result).toBeNull();
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});
