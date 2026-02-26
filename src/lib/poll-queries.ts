import { eq, and, desc, count, inArray } from "drizzle-orm";
import { db, polls, pollResponses } from "@/lib/db";

/**
 * Get the active poll for a workspace.
 * Lazily closes time-expired polls before returning.
 */
export async function getActivePoll(workspaceId: string) {
  const activePoll = await db.query.polls.findFirst({
    where: and(eq(polls.workspaceId, workspaceId), eq(polls.status, "active")),
  });

  if (!activePoll) return null;

  // Lazy close: if closesAt has passed, close it
  if (activePoll.closesAt && activePoll.closesAt < new Date()) {
    await db
      .update(polls)
      .set({ status: "closed", closedAt: new Date() })
      .where(eq(polls.id, activePoll.id));
    return null;
  }

  return activePoll;
}

/**
 * Get a poll by ID with response count, scoped to workspace.
 */
export async function getPollById(pollId: string, workspaceId: string) {
  const poll = await db.query.polls.findFirst({
    where: and(eq(polls.id, pollId), eq(polls.workspaceId, workspaceId)),
  });

  if (!poll) return null;

  const [responseCount] = await db
    .select({ count: count() })
    .from(pollResponses)
    .where(eq(pollResponses.pollId, pollId));

  return { ...poll, responseCount: responseCount?.count ?? 0 };
}

/**
 * List all polls for a workspace with response counts.
 */
export async function listWorkspacePolls(workspaceId: string) {
  const workspacePolls = await db.query.polls.findMany({
    where: eq(polls.workspaceId, workspaceId),
    orderBy: [desc(polls.createdAt)],
  });

  if (workspacePolls.length === 0) return [];

  const pollIds = workspacePolls.map((p) => p.id);
  const counts = await db
    .select({ pollId: pollResponses.pollId, count: count() })
    .from(pollResponses)
    .where(inArray(pollResponses.pollId, pollIds))
    .groupBy(pollResponses.pollId);

  const countMap = new Map(counts.map((c) => [c.pollId, c.count]));

  return workspacePolls.map((poll) => ({
    ...poll,
    responseCount: countMap.get(poll.id) ?? 0,
  }));
}

/**
 * Get poll responses with contributor info and linked idea title.
 */
export async function getPollResponses(pollId: string) {
  return db.query.pollResponses.findMany({
    where: eq(pollResponses.pollId, pollId),
    orderBy: [desc(pollResponses.createdAt)],
    with: {
      contributor: {
        columns: { id: true, email: true, name: true },
      },
      linkedIdea: {
        columns: { id: true, title: true },
      },
    },
  });
}
