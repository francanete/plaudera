import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, ideaStrategicTags, strategicTags } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getIdeaWithOwnerCheck } from "@/lib/idea-updates";
import { BadRequestError } from "@/lib/errors";

const tagSchema = z.object({
  tagId: z.string().min(1),
});

type Params = { id: string };

export const POST = protectedApiRouteWrapper<Params>(
  async (request, { session, params }) => {
    const { id } = params;
    const idea = await getIdeaWithOwnerCheck(id, session.user.id);

    const body = await request.json();
    const { tagId } = tagSchema.parse(body);

    // Verify tag belongs to the same workspace as the idea
    const tag = await db.query.strategicTags.findFirst({
      where: and(
        eq(strategicTags.id, tagId),
        eq(strategicTags.workspaceId, idea.workspaceId)
      ),
    });
    if (!tag) {
      throw new BadRequestError("Tag not found in this workspace");
    }

    await db
      .insert(ideaStrategicTags)
      .values({ ideaId: id, tagId })
      .onConflictDoNothing();

    return NextResponse.json({ success: true }, { status: 201 });
  },
  { requirePaid: false }
);

export const DELETE = protectedApiRouteWrapper<Params>(
  async (request, { session, params }) => {
    const { id } = params;
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
  },
  { requirePaid: false }
);
