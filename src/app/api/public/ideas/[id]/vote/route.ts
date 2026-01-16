import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ideas, votes } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getContributor } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/public/ideas/[id]/vote
 * Toggle vote on an idea (requires contributor auth)
 * Uses contributorId from cookie
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ideaId } = await params;

    // Check contributor authentication
    const contributor = await getContributor();
    if (!contributor) {
      throw new UnauthorizedError("Please verify your email to vote");
    }

    // Find the idea
    const idea = await db.query.ideas.findFirst({
      where: eq(ideas.id, ideaId),
    });

    if (!idea) {
      throw new NotFoundError("Idea not found");
    }

    // Check if already voted
    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(votes.ideaId, ideaId),
        eq(votes.contributorId, contributor.id)
      ),
    });

    let voted: boolean;
    let newVoteCount: number;

    if (existingVote) {
      // Remove vote (toggle off)
      await db
        .delete(votes)
        .where(
          and(
            eq(votes.ideaId, ideaId),
            eq(votes.contributorId, contributor.id)
          )
        );

      // Decrement vote count atomically
      const [updated] = await db
        .update(ideas)
        .set({ voteCount: sql`GREATEST(${ideas.voteCount} - 1, 0)` })
        .where(eq(ideas.id, ideaId))
        .returning({ voteCount: ideas.voteCount });

      voted = false;
      newVoteCount = updated.voteCount;
    } else {
      // Add vote (toggle on)
      try {
        await db.insert(votes).values({
          ideaId,
          contributorId: contributor.id,
        });

        // Increment vote count atomically
        const [updated] = await db
          .update(ideas)
          .set({ voteCount: sql`${ideas.voteCount} + 1` })
          .where(eq(ideas.id, ideaId))
          .returning({ voteCount: ideas.voteCount });

        voted = true;
        newVoteCount = updated.voteCount;
      } catch (error) {
        // Handle unique constraint violation (race condition)
        // If vote already exists, just return current state
        const currentIdea = await db.query.ideas.findFirst({
          where: eq(ideas.id, ideaId),
        });
        voted = true;
        newVoteCount = currentIdea?.voteCount ?? idea.voteCount;
      }
    }

    return NextResponse.json({
      voted,
      voteCount: newVoteCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
