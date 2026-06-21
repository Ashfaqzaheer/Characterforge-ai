// Feature: character-forge-ai — Upload body size pre-check (413 before buffering)

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuth = vi.fn();
const mockGetCharacterById = vi.fn();
const mockValidateAndUpload = vi.fn();

vi.mock("../../lib/auth-helpers", () => ({
  get getAuthenticatedUser() { return mockGetAuth; },
}));

vi.mock("../../services/character.service", () => ({
  get getCharacterById() { return mockGetCharacterById; },
  ForbiddenError: class extends Error { constructor() { super(); this.name = "ForbiddenError"; } },
}));

vi.mock("../../services/upload.service", () => ({
  get validateAndUpload() { return mockValidateAndUpload; },
  UploadValidationError: class extends Error {
    code: string;
    constructor(code: string, msg: string) { super(msg); this.code = code; this.name = "UploadValidationError"; }
  },
  MAX_FILE_SIZE: 5 * 1024 * 1024,
}));

describe("Upload body size pre-check", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 413 when Content-Length exceeds MAX_REQUEST_BODY_SIZE, without calling formData", async () => {
    const { POST } = await import("../../app/api/characters/[id]/images/route");

    // 10MB declared — way over the 5MB + 64KB limit
    const request = new Request("http://localhost/api/characters/abc/images", {
      method: "POST",
      headers: {
        "Content-Length": String(10 * 1024 * 1024),
        "Content-Type": "multipart/form-data; boundary=----test",
      },
      body: "fake-body",
    });

    const response = await POST(request as any, { params: Promise.resolve({ id: "abc" }) });

    expect(response.status).toBe(413);
    const data = await response.json();
    expect(data.error.code).toBe("FILE_TOO_LARGE");

    // Crucially: auth, character lookup, and upload processing should NOT have been called
    expect(mockGetAuth).not.toHaveBeenCalled();
    expect(mockGetCharacterById).not.toHaveBeenCalled();
    expect(mockValidateAndUpload).not.toHaveBeenCalled();
  });

  it("allows request with Content-Length under the limit to proceed normally", async () => {
    const { POST } = await import("../../app/api/characters/[id]/images/route");

    mockGetAuth.mockResolvedValue({ id: "user-1", supabaseId: "sup-1", email: "a@b.com", creditBalance: 10, createdAt: new Date(), updatedAt: new Date() });
    mockGetCharacterById.mockResolvedValue({ id: "char-1", userId: "user-1", images: [] });
    mockValidateAndUpload.mockResolvedValue({ id: "img-1", storageKey: "refs/key.png" });

    // Create a small valid formData body
    const formData = new FormData();
    const blob = new Blob(["x".repeat(100)], { type: "image/png" });
    formData.append("file", blob, "test.png");

    const request = new Request("http://localhost/api/characters/char-1/images", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as any, { params: Promise.resolve({ id: "char-1" }) });

    // Should proceed past the size check — either 201 success or some other non-413 response
    expect(response.status).not.toBe(413);
    expect(mockGetAuth).toHaveBeenCalled();
  });
});
