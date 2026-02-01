import { inngest, type InngestStepLike } from "../client";
import { db, workspaces, ideas } from "@/lib/db";
import { sql, count } from "drizzle-orm";
import {
  syncWorkspaceEmbeddings,
  findDuplicatesInWorkspace,
  createDuplicateSuggestions,
  MIN_IDEAS_FOR_DETECTION,
} from "@/lib/ai";

// Configuration
const BATCH_SIZE = 10; // Workspaces per batch
const DELAY_BETWEEN_BATCHES_MS = 5000; // 5 seconds

/**
 * Extracted handler for testability.
 * Processes all eligible workspaces to find and suggest duplicate ideas.
 */
export async function detectDuplicatesHandler(step: InngestStepLike) {
  // Step 1: Fetch workspaces with enough ideas for detection
  const eligibleWorkspaces = await step.run(
    "fetch-eligible-workspaces",
    async () => {
      // Find workspaces with at least MIN_IDEAS_FOR_DETECTION non-merged ideas
      const result = await db
        .select({
          id: workspaces.id,
          ideaCount: count(ideas.id),
        })
        .from(workspaces)
        .leftJoin(
          ideas,
          sql`${ideas.workspaceId} = ${workspaces.id} AND ${ideas.status} != 'MERGED'`
        )
        .groupBy(workspaces.id)
        .having(sql`count(${ideas.id}) >= ${MIN_IDEAS_FOR_DETECTION}`);

      return result;
    }
  );

  if (eligibleWorkspaces.length === 0) {
    return {
      total: 0,
      processed: 0,
      embeddingsSynced: 0,
      suggestionsCreated: 0,
      errors: 0,
      message: "No eligible workspaces found",
    };
  }

  // Step 2: Process workspaces in batches
  let processed = 0;
  let embeddingsSynced = 0;
  let suggestionsCreated = 0;
  let errors = 0;

  for (let i = 0; i < eligibleWorkspaces.length; i += BATCH_SIZE) {
    const batch = eligibleWorkspaces.slice(i, i + BATCH_SIZE);

    for (const workspace of batch) {
      try {
        const result = await step.run(
          `process-workspace-${workspace.id}`,
          async () => {
            // Sync any missing embeddings first
            const synced = await syncWorkspaceEmbeddings(workspace.id);

            // Find duplicate pairs above threshold
            const pairs = await findDuplicatesInWorkspace(workspace.id);

            // Create suggestions for new pairs
            const created = await createDuplicateSuggestions(
              workspace.id,
              pairs
            );

            return { synced, created };
          }
        );

        embeddingsSynced += result.synced;
        suggestionsCreated += result.created;
        processed++;
      } catch (error) {
        console.error(
          `[detect-duplicates] Failed workspace ${workspace.id}:`,
          error
        );
        errors++;
      }
    }

    // Delay between batches (except after last batch)
    if (i + BATCH_SIZE < eligibleWorkspaces.length) {
      await step.sleep("batch-cooldown", DELAY_BETWEEN_BATCHES_MS);
    }
  }

  return {
    total: eligibleWorkspaces.length,
    processed,
    embeddingsSynced,
    suggestionsCreated,
    errors,
  };
}

/**
 * Daily cron job to detect duplicate ideas across all workspaces.
 * Runs at 3 AM UTC to minimize impact on users.
 */
export const detectDuplicatesJob = inngest.createFunction(
  { id: "detect-duplicates" },
  { cron: "0 3 * * *" }, // Daily at 3 AM UTC
  // { cron: "* * * * *" }, // IMPORTANT: only for testing
  async ({ step }) => detectDuplicatesHandler(step as InngestStepLike)
);
