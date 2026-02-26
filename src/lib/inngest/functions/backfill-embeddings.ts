import { inngest, type InngestStepLike } from "../client";
import { db, ideas, ideaEmbeddings } from "@/lib/db";
import { eq, ne, gt, and, asc, isNull, isNotNull } from "drizzle-orm";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";

const BATCH_SIZE = 20;

/**
 * Extracted handler for testability.
 * Generates problem embeddings for ideas that don't have one yet.
 * Only processes ideas missing a problemEmbedding to avoid redundant API calls.
 */
export async function backfillEmbeddingsHandler(
  step: InngestStepLike,
  workspaceId?: string
) {
  let lastProcessedId: string | null = null;
  let totalProcessed = 0;
  let totalErrors = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch: {
      id: string;
      title: string;
      problemStatement: string | null;
    }[] = await step.run(
      `fetch-batch-after-${lastProcessedId ?? "start"}`,
      async () => {
        const conditions = [
          ne(ideas.status, "MERGED"),
          isNotNull(ideas.problemStatement),
        ];
        if (workspaceId) {
          conditions.push(eq(ideas.workspaceId, workspaceId));
        }
        if (lastProcessedId) {
          conditions.push(gt(ideas.id, lastProcessedId));
        }

        return db
          .select({
            id: ideas.id,
            title: ideas.title,
            problemStatement: ideas.problemStatement,
          })
          .from(ideas)
          .leftJoin(ideaEmbeddings, eq(ideaEmbeddings.ideaId, ideas.id))
          .where(and(...conditions, isNull(ideaEmbeddings.problemEmbedding)))
          .orderBy(asc(ideas.id))
          .limit(BATCH_SIZE);
      }
    );

    if (batch.length === 0) break;

    const result: { processed: number; errors: number; lastId: string } =
      await step.run(`process-batch-${batch[0].id}`, async () => {
        let processed = 0;
        let errors = 0;

        for (const idea of batch) {
          try {
            await updateIdeaEmbedding(
              idea.id,
              idea.title,
              idea.problemStatement
            );
            processed++;
          } catch (error) {
            console.error(
              `[backfill-embeddings] Failed idea ${idea.id}:`,
              error
            );
            errors++;
          }
        }

        return { processed, errors, lastId: batch[batch.length - 1].id };
      });

    totalProcessed += result.processed;
    totalErrors += result.errors;
    lastProcessedId = result.lastId;
  }

  return {
    totalProcessed,
    totalErrors,
    workspaceId: workspaceId ?? "all",
  };
}

export const backfillEmbeddingsJob = inngest.createFunction(
  { id: "backfill-embeddings" },
  { event: "embedding/backfill-requested" },
  async ({ event, step }) =>
    backfillEmbeddingsHandler(step as InngestStepLike, event.data.workspaceId)
);
