import { eq, and, count, sql } from "drizzle-orm";
import { z } from "zod";
import { db, polls, pollResponses } from "@/lib/db";
import { NotFoundError, BadRequestError, ConflictError } from "@/lib/errors";

export const createPollSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(500, "Question too long"),
  templateType: z.enum(["cant_do", "most_annoying", "custom"]).optional(),
  status: z.enum(["draft", "active"]).default("draft"),
  maxResponses: z.number().int().positive().optional().nullable(),
  closesAt: z.string().datetime().optional().nullable(),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;

/**
 * Create a poll. If status='active', closes any current active poll first.
 */
export async function createPoll(workspaceId: string, data: CreatePollInput) {
  if (data.status === "active") {
    return db.transaction(async (tx) => {
      // Close any currently active poll
      await tx
        .update(polls)
        .set({ status: "closed", closedAt: new Date() })
        .where(
          and(eq(polls.workspaceId, workspaceId), eq(polls.status, "active"))
        );

      const [newPoll] = await tx
        .insert(polls)
        .values({
          workspaceId,
          question: data.question,
          templateType: data.templateType || null,
          status: "active",
          maxResponses: data.maxResponses ?? null,
          closesAt: data.closesAt ? new Date(data.closesAt) : null,
        })
        .returning();

      return newPoll;
    });
  }

  const [newPoll] = await db
    .insert(polls)
    .values({
      workspaceId,
      question: data.question,
      templateType: data.templateType || null,
      status: "draft",
      maxResponses: data.maxResponses ?? null,
      closesAt: data.closesAt ? new Date(data.closesAt) : null,
    })
    .returning();

  return newPoll;
}

/**
 * Activate a draft poll, closing any current active poll.
 */
export async function activatePoll(pollId: string, workspaceId: string) {
  const poll = await db.query.polls.findFirst({
    where: and(eq(polls.id, pollId), eq(polls.workspaceId, workspaceId)),
  });

  if (!poll) throw new NotFoundError("Poll not found");
  if (poll.status === "active")
    throw new BadRequestError("Poll is already active");
  if (poll.status === "closed")
    throw new BadRequestError("Cannot activate a closed poll");

  return db.transaction(async (tx) => {
    // Close current active poll
    await tx
      .update(polls)
      .set({ status: "closed", closedAt: new Date() })
      .where(
        and(eq(polls.workspaceId, workspaceId), eq(polls.status, "active"))
      );

    const [activated] = await tx
      .update(polls)
      .set({ status: "active" })
      .where(eq(polls.id, pollId))
      .returning();

    return activated;
  });
}

/**
 * Close an active poll.
 */
export async function closePoll(pollId: string, workspaceId: string) {
  const poll = await db.query.polls.findFirst({
    where: and(eq(polls.id, pollId), eq(polls.workspaceId, workspaceId)),
  });

  if (!poll) throw new NotFoundError("Poll not found");
  if (poll.status === "closed")
    throw new BadRequestError("Poll is already closed");

  const [closed] = await db
    .update(polls)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(polls.id, pollId))
    .returning();

  return closed;
}

/**
 * Submit a response to a poll.
 * Checks: poll is active, contributor hasn't already responded, response length.
 * Auto-closes poll if maxResponses reached.
 */
export async function submitPollResponse(
  pollId: string,
  contributorId: string,
  response: string,
  workspaceId: string
) {
  if (response.length > 700) {
    throw new BadRequestError("Response must be 700 characters or fewer");
  }

  if (response.trim().length === 0) {
    throw new BadRequestError("Response cannot be empty");
  }

  return db.transaction(async (tx) => {
    // Lock the poll row to prevent concurrent responses from racing
    const pollResult = await tx.execute(sql`
      SELECT id, workspace_id AS "workspaceId", question, status,
             max_responses AS "maxResponses", closes_at AS "closesAt"
      FROM polls
      WHERE id = ${pollId} AND workspace_id = ${workspaceId}
      FOR UPDATE
    `);
    const poll = pollResult.rows[0] as
      | {
          id: string;
          workspaceId: string;
          status: string;
          maxResponses: number | null;
          closesAt: Date | null;
        }
      | undefined;

    if (!poll) throw new NotFoundError("Poll not found");
    if (poll.status !== "active")
      throw new BadRequestError("Poll is not active");

    // Check if already responded (inside transaction for consistency)
    const existing = await tx.query.pollResponses.findFirst({
      where: and(
        eq(pollResponses.pollId, pollId),
        eq(pollResponses.contributorId, contributorId)
      ),
    });

    if (existing)
      throw new ConflictError("You have already responded to this poll");

    const [newResponse] = await tx
      .insert(pollResponses)
      .values({
        pollId,
        contributorId,
        response: response.trim(),
      })
      .returning();

    // Check maxResponses auto-close (count is accurate under the lock)
    if (poll.maxResponses) {
      const [responseCount] = await tx
        .select({ count: count() })
        .from(pollResponses)
        .where(eq(pollResponses.pollId, pollId));

      if ((responseCount?.count ?? 0) >= poll.maxResponses) {
        await tx
          .update(polls)
          .set({ status: "closed", closedAt: new Date() })
          .where(eq(polls.id, pollId));
      }
    }

    return newResponse;
  });
}

/**
 * Link a poll response to an existing idea.
 */
export async function linkResponseToIdea(
  responseId: string,
  pollId: string,
  ideaId: string | null
) {
  const [updated] = await db
    .update(pollResponses)
    .set({ linkedIdeaId: ideaId })
    .where(
      and(eq(pollResponses.id, responseId), eq(pollResponses.pollId, pollId))
    )
    .returning();

  if (!updated) throw new NotFoundError("Response not found");

  return updated;
}
