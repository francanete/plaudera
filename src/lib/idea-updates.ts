import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  ideas,
  roadmapStatusChanges,
  ideaStatusChanges,
  duplicateSuggestions,
  type IdeaStatus,
  type RoadmapStatus,
  type DecisionType,
} from "@/lib/db";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";
import { ALL_IDEA_STATUSES } from "@/lib/idea-status-config";
import {
  ALL_ROADMAP_STATUSES,
  ROADMAP_STATUS_ORDER,
} from "@/lib/roadmap-status-config";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";

export const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  problemStatement: z
    .string()
    .max(2000, "Problem statement too long")
    .optional(),
  frequencyTag: z.enum(["daily", "weekly", "monthly", "rarely"]).optional(),
  workflowImpact: z
    .enum(["blocker", "major", "minor", "nice_to_have"])
    .optional(),
  workflowStage: z
    .enum([
      "onboarding",
      "setup",
      "daily_workflow",
      "billing",
      "reporting",
      "integrations",
      "other",
    ])
    .optional(),
  roadmapStatus: z.enum(["PLANNED", "IN_PROGRESS", "RELEASED"]).optional(),
  featureDetails: z.string().max(2000, "Feature details too long").optional(),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;

/**
 * Options for public/contributor submissions that don't go through
 * the dashboard auth flow.
 */
export interface PublicSubmissionOptions {
  contributorId: string;
  authorEmail: string;
  /** Public submissions default to UNDER_REVIEW instead of PUBLISHED */
  defaultStatus?: "UNDER_REVIEW" | "PUBLISHED";
}

/**
 * Create a new idea, optionally placing it directly on the roadmap.
 * When roadmapStatus is provided, uses a transaction to atomically
 * insert the idea and its audit log entry.
 *
 * Pass `publicSubmission` for contributor-submitted ideas (public board/widget).
 */
export async function createIdea(
  workspaceId: string,
  userId: string | null,
  data: CreateIdeaInput,
  publicSubmission?: PublicSubmissionOptions
) {
  const isRoadmapIdea = !!data.roadmapStatus;
  const defaultStatus = publicSubmission?.defaultStatus ?? "PUBLISHED";

  const baseValues = {
    workspaceId,
    title: data.title,
    description: data.description || null,
    problemStatement: data.problemStatement || null,
    frequencyTag: data.frequencyTag || null,
    workflowImpact: data.workflowImpact || null,
    workflowStage: data.workflowStage || null,
    voteCount: 0,
    ...(publicSubmission && {
      contributorId: publicSubmission.contributorId,
      authorEmail: publicSubmission.authorEmail,
    }),
  };

  let newIdea;

  if (isRoadmapIdea) {
    newIdea = await db.transaction(async (tx) => {
      const [idea] = await tx
        .insert(ideas)
        .values({
          ...baseValues,
          status: "PUBLISHED",
          roadmapStatus: data.roadmapStatus!,
          featureDetails: data.featureDetails || null,
        })
        .returning();

      await tx.insert(roadmapStatusChanges).values({
        ideaId: idea.id,
        fromStatus: "NONE",
        toStatus: data.roadmapStatus!,
        changedBy: userId,
      });

      return idea;
    });
  } else {
    [newIdea] = await db
      .insert(ideas)
      .values({
        ...baseValues,
        status: defaultStatus,
      })
      .returning();
  }

  // Generate embedding for duplicate detection (fire-and-forget)
  updateIdeaEmbedding(
    newIdea.id,
    newIdea.title,
    newIdea.problemStatement
  ).catch((err) =>
    console.error("Failed to generate embedding for idea:", err)
  );

  return newIdea;
}

export const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  problemStatement: z.string().max(2000).optional().nullable(),
  frequencyTag: z
    .enum(["daily", "weekly", "monthly", "rarely"])
    .optional()
    .nullable(),
  workflowImpact: z
    .enum(["blocker", "major", "minor", "nice_to_have"])
    .optional()
    .nullable(),
  workflowStage: z
    .enum([
      "onboarding",
      "setup",
      "daily_workflow",
      "billing",
      "reporting",
      "integrations",
      "other",
    ])
    .optional()
    .nullable(),
  status: z.enum(ALL_IDEA_STATUSES as [IdeaStatus, ...IdeaStatus[]]).optional(),
  roadmapStatus: z
    .enum(ALL_ROADMAP_STATUSES as [RoadmapStatus, ...RoadmapStatus[]])
    .optional(),
  internalNote: z.string().max(2000).optional().nullable(),
  publicUpdate: z.string().max(1000).optional().nullable(),
  featureDetails: z.string().max(2000).optional().nullable(),
  showPublicUpdateOnRoadmap: z.boolean().optional(),
  rationale: z.string().max(2000).optional(),
  wontBuildReason: z.string().max(2000).optional().nullable(),
  isPublicRationale: z.boolean().optional(),
});

export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

/**
 * Verify idea exists and belongs to the user's workspace.
 * Throws NotFoundError or ForbiddenError on failure.
 */
export async function getIdeaWithOwnerCheck(ideaId: string, userId: string) {
  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, ideaId),
    with: {
      workspace: { columns: { ownerId: true } },
    },
  });

  if (!idea) {
    throw new NotFoundError("Idea not found");
  }

  if (idea.workspace.ownerId !== userId) {
    throw new ForbiddenError("You don't have access to this idea");
  }

  return idea;
}

// ============ Decision Type Classification ============

/**
 * Determine the decision type for a roadmap status change.
 */
export function classifyRoadmapDecision(
  from: RoadmapStatus,
  to: RoadmapStatus
): DecisionType {
  if (from === "NONE" && to !== "NONE") return "prioritized";
  if (ROADMAP_STATUS_ORDER[to] < ROADMAP_STATUS_ORDER[from])
    return "deprioritized";
  return "status_progression";
}

/**
 * Determine the decision type for an idea status change.
 */
export function classifyIdeaStatusDecision(
  from: IdeaStatus,
  to: IdeaStatus
): DecisionType {
  if (to === "DECLINED") return "declined";
  // UNDER_REVIEW → PUBLISHED is forward progression
  if (from === "UNDER_REVIEW" && to === "PUBLISHED")
    return "status_progression";
  // PUBLISHED → UNDER_REVIEW is a reversal
  if (from === "PUBLISHED" && to === "UNDER_REVIEW") return "status_reversal";
  return "status_progression";
}

/**
 * Check if a roadmap transition is "governed" (requires rationale).
 * - First entry to roadmap (NONE → anything)
 * - Roadmap regression (higher → lower, e.g. IN_PROGRESS → PLANNED)
 */
function isGovernedRoadmapTransition(
  from: RoadmapStatus,
  to: RoadmapStatus
): boolean {
  if (from === to) return false;
  if (from === "NONE" && to !== "NONE") return true; // prioritized
  return ROADMAP_STATUS_ORDER[to] < ROADMAP_STATUS_ORDER[from]; // deprioritized
}

/**
 * Update an idea with full business rule enforcement:
 * - Irreversibility guard (cannot remove from roadmap)
 * - Auto-publish (UNDER_REVIEW -> PUBLISHED when moving to roadmap)
 * - Audit logging for roadmap and idea status changes
 * - Rationale enforcement for governed transitions
 * - Auto-dismiss pending duplicate suggestions when moving to roadmap
 * - Embedding regeneration on title/description change
 */
export async function updateIdea(
  ideaId: string,
  userId: string,
  data: UpdateIdeaInput
) {
  const idea = await getIdeaWithOwnerCheck(ideaId, userId);

  if (data.status === "MERGED") {
    throw new BadRequestError("Use the merge endpoint to merge ideas");
  }

  if (idea.status === "MERGED") {
    throw new BadRequestError("Cannot modify a merged idea");
  }

  // Build update object with only provided fields
  const updateData: Partial<{
    title: string;
    description: string | null;
    problemStatement: string | null;
    frequencyTag: "daily" | "weekly" | "monthly" | "rarely" | null;
    workflowImpact: "blocker" | "major" | "minor" | "nice_to_have" | null;
    workflowStage:
      | "onboarding"
      | "setup"
      | "daily_workflow"
      | "billing"
      | "reporting"
      | "integrations"
      | "other"
      | null;
    status: IdeaStatus;
    roadmapStatus: RoadmapStatus;
    internalNote: string | null;
    publicUpdate: string | null;
    featureDetails: string | null;
    showPublicUpdateOnRoadmap: boolean;
    wontBuildReason: string | null;
    mergedIntoId: string | null;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.problemStatement !== undefined)
    updateData.problemStatement = data.problemStatement;
  if (data.frequencyTag !== undefined)
    updateData.frequencyTag = data.frequencyTag;
  if (data.workflowImpact !== undefined)
    updateData.workflowImpact = data.workflowImpact;
  if (data.workflowStage !== undefined)
    updateData.workflowStage = data.workflowStage;
  if (data.internalNote !== undefined)
    updateData.internalNote = data.internalNote;
  if (data.publicUpdate !== undefined)
    updateData.publicUpdate = data.publicUpdate;
  if (data.featureDetails !== undefined)
    updateData.featureDetails = data.featureDetails;
  if (data.showPublicUpdateOnRoadmap !== undefined)
    updateData.showPublicUpdateOnRoadmap = data.showPublicUpdateOnRoadmap;

  // Track roadmap status changes for audit log
  let roadmapStatusChanged = false;
  const previousRoadmapStatus = idea.roadmapStatus;

  if (data.roadmapStatus !== undefined) {
    // Irreversibility guard: ideas cannot be removed from the roadmap
    if (idea.roadmapStatus !== "NONE" && data.roadmapStatus === "NONE") {
      throw new BadRequestError("Ideas cannot be removed from the roadmap");
    }

    updateData.roadmapStatus = data.roadmapStatus;
    roadmapStatusChanged = data.roadmapStatus !== idea.roadmapStatus;

    // Rationale enforcement for governed roadmap transitions
    if (
      roadmapStatusChanged &&
      isGovernedRoadmapTransition(idea.roadmapStatus, data.roadmapStatus) &&
      !data.rationale
    ) {
      throw new BadRequestError(
        "Rationale is required for this roadmap status change"
      );
    }

    // Auto-publish: when moving to roadmap, publish if still under review
    if (
      roadmapStatusChanged &&
      idea.roadmapStatus === "NONE" &&
      data.roadmapStatus !== "NONE" &&
      idea.status === "UNDER_REVIEW"
    ) {
      updateData.status = "PUBLISHED";
    }
  }

  // Track idea status changes (including auto-publish)
  let ideaStatusChanged =
    updateData.status !== undefined && updateData.status !== idea.status;
  const previousIdeaStatus = idea.status;

  if (data.status !== undefined) {
    // Block declining ideas that are on the roadmap
    const effectiveRoadmapStatus = data.roadmapStatus ?? idea.roadmapStatus;
    if (data.status === "DECLINED" && effectiveRoadmapStatus !== "NONE") {
      throw new BadRequestError(
        "Cannot decline an idea that is on the roadmap"
      );
    }

    // Rationale enforcement: DECLINED requires rationale
    if (data.status === "DECLINED" && !data.rationale) {
      throw new BadRequestError("Rationale is required when declining an idea");
    }

    // Set wontBuildReason when declining with a reason
    if (data.status === "DECLINED") {
      updateData.wontBuildReason = data.wontBuildReason ?? null;
    }

    updateData.status = data.status;
    ideaStatusChanged = ideaStatusChanged || data.status !== idea.status;
  }

  const updatedIdea = await db.transaction(async (tx) => {
    const [result] = await tx
      .update(ideas)
      .set(updateData)
      .where(eq(ideas.id, ideaId))
      .returning();

    // Log roadmap status change to audit table
    if (
      roadmapStatusChanged &&
      result.roadmapStatus !== previousRoadmapStatus
    ) {
      const decisionType = classifyRoadmapDecision(
        previousRoadmapStatus,
        result.roadmapStatus
      );
      await tx.insert(roadmapStatusChanges).values({
        ideaId: idea.id,
        fromStatus: previousRoadmapStatus,
        toStatus: result.roadmapStatus,
        changedBy: userId,
        rationale: data.rationale ?? null,
        isPublic: data.isPublicRationale ?? false,
        decisionType,
      });
    }

    // Log idea status change to audit table
    if (ideaStatusChanged && result.status !== previousIdeaStatus) {
      const decisionType = classifyIdeaStatusDecision(
        previousIdeaStatus,
        result.status
      );
      await tx.insert(ideaStatusChanges).values({
        ideaId: idea.id,
        userId,
        fromStatus: previousIdeaStatus,
        toStatus: result.status,
        rationale: data.rationale ?? null,
        isPublic: data.isPublicRationale ?? false,
        decisionType,
      });
    }

    // Auto-dismiss pending duplicate suggestions when moving to roadmap
    if (previousRoadmapStatus === "NONE" && result.roadmapStatus !== "NONE") {
      await tx
        .update(duplicateSuggestions)
        .set({ status: "DISMISSED" })
        .where(
          and(
            eq(duplicateSuggestions.status, "PENDING"),
            or(
              eq(duplicateSuggestions.sourceIdeaId, idea.id),
              eq(duplicateSuggestions.duplicateIdeaId, idea.id)
            )
          )
        );
    }

    return result;
  });

  // Regenerate embedding if title, description, or problem statement changed (fire-and-forget)
  if (
    data.title !== undefined ||
    data.description !== undefined ||
    data.problemStatement !== undefined
  ) {
    updateIdeaEmbedding(
      updatedIdea.id,
      updatedIdea.title,
      updatedIdea.problemStatement
    ).catch((err) =>
      console.error("Failed to update embedding for idea:", err)
    );
  }

  return updatedIdea;
}
