import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth-helpers";
import { getHistory } from "../../../services/history.service";

/**
 * GET /api/generations — Returns paginated generation history for the authenticated user.
 * Query params: page (default 1), pageSize (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const pageSizeParam = parseInt(searchParams.get("pageSize") || "20", 10);

  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam >= 1
      ? Math.min(pageSizeParam, 100)
      : 20;

  try {
    const history = await getHistory(user.id, page, pageSize);
    return NextResponse.json({
      generations: history.records.map((r) => ({
        id: r.id,
        prompt: r.prompt,
        imageKey: r.imageKey,
        aspectRatio: r.aspectRatio,
        status: r.status,
        createdAt: r.createdAt,
        character: { name: r.characterName },
      })),
      totalPages: Math.ceil(history.total / history.pageSize),
      page: history.page,
      total: history.total,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/generations:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
