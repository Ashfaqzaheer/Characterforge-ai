import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth-helpers";
import { prisma } from "../../../../../lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const character = await prisma.character.findUnique({
    where: { id },
    select: { id: true, name: true, userId: true, createdAt: true },
  });

  if (!character) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Character not found" } },
      { status: 404 }
    );
  }

  if (character.userId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You do not have access to this resource" } },
      { status: 403 }
    );
  }

  const generations = await prisma.generation.findMany({
    where: { characterId: id, userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      prompt: true,
      imageKey: true,
      aspectRatio: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({
    character: { id: character.id, name: character.name, createdAt: character.createdAt },
    timeline: generations,
  });
}
