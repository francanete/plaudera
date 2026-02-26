import { eq, and, count } from "drizzle-orm";
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

  const poll = await db.query.polls.findFirst({
    where: and(eq(polls.id, pollId), eq(polls.workspaceId, workspaceId)),
  });

  if (!poll) throw new NotFoundError("Poll not found");
  if (poll.status !== "active") throw new BadRequestError("Poll is not active");

  // Check if already responded
  const existing = await db.query.pollResponses.findFirst({
    where: and(
      eq(pollResponses.pollId, pollId),
      eq(pollResponses.contributorId, contributorId)
    ),
  });

  if (existing)
    throw new ConflictError("You have already responded to this poll");

  const [newResponse] = await db
    .insert(pollResponses)
    .values({
      pollId,
      contributorId,
      response: response.trim(),
    })
    .returning();

  // Check maxResponses auto-close
  if (poll.maxResponses) {
    const [responseCount] = await db
      .select({ count: count() })
      .from(pollResponses)
      .where(eq(pollResponses.pollId, pollId));

    if ((responseCount?.count ?? 0) >= poll.maxResponses) {
      await db
        .update(polls)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(polls.id, pollId));
    }
  }

  return newResponse;
}

/**
 * Link a poll response to an existing idea.
 */
export async function linkResponseToIdea(
  responseId: string,
  ideaId: string | null
) {
  const [updated] = await db
    .update(pollResponses)
    .set({ linkedIdeaId: ideaId })
    .where(eq(pollResponses.id, responseId))
    .returning();

  if (!updated) throw new NotFoundError("Response not found");

  return updated;
}
