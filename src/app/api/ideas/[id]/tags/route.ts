import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, ideaStrategicTags } from "@/lib/db";
import { handleApiError } from "@/lib/api-utils";
import { getIdeaWithOwnerCheck } from "@/lib/idea-updates";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UnauthorizedError } from "@/lib/errors";

const tagSchema = z.object({
  tagId: z.string().min(1),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new UnauthorizedError("Not authenticated");

    await getIdeaWithOwnerCheck(id, session.user.id);

    const body = await request.json();
    const { tagId } = tagSchema.parse(body);

    await db
      .insert(ideaStrategicTags)
      .values({ ideaId: id, tagId })
      .onConflictDoNothing();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new UnauthorizedError("Not authenticated");

    await getIdeaWithOwnerCheck(id, session.user.id);

    const body = await request.json();
    const { tagId } = tagSchema.parse(body);

    await db
      .delete(ideaStrategicTags)
      .where(
        and(
          eq(ideaStrategicTags.ideaId, id),
          eq(ideaStrategicTags.tagId, tagId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
