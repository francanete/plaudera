import { embed } from "ai";
import { eq, isNull, and, ne } from "drizzle-orm";
import { google } from "@/lib/ai";
import { db, ideaEmbeddings, ideas } from "@/lib/db";

// Configuration
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

/**
 * Generate an embedding vector for the given text using Google's gemini-embedding-001 model.
 * Truncates to 768 dimensions (Matryoshka property preserves similarity).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
  });
  return embedding.slice(0, EMBEDDING_DIMENSIONS);
}

/**
 * Normalize a problem statement for embedding: trim, collapse whitespace,
 * truncate to first ~200 chars (at sentence boundary if possible).
 */
export function normalizeProblemSummary(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 200) return cleaned;
  // Try to cut at sentence boundary
  const truncated = cleaned.slice(0, 200);
  const lastPeriod = truncated.lastIndexOf(".");
  if (lastPeriod > 100) return truncated.slice(0, lastPeriod + 1);
  return truncated;
}

/**
 * Create or update the embedding for an idea.
 * Generates a title embedding and optionally a problem embedding.
 */
export async function updateIdeaEmbedding(
  ideaId: string,
  title: string,
  problemStatement?: string | null
): Promise<void> {
  // Generate title-only embedding
  const titleEmbedding = await generateEmbedding(title);

  // Generate problem embedding when available
  let problemEmbedding: number[] | null = null;
  if (problemStatement?.trim()) {
    const normalized = normalizeProblemSummary(problemStatement);
    problemEmbedding = await generateEmbedding(normalized);
  }

  // Upsert both embeddings
  await db
    .insert(ideaEmbeddings)
    .values({
      ideaId,
      embedding: titleEmbedding,
      problemEmbedding: problemEmbedding,
      modelVersion: EMBEDDING_MODEL,
    })
    .onConflictDoUpdate({
      target: ideaEmbeddings.ideaId,
      set: {
        embedding: titleEmbedding,
        problemEmbedding: problemEmbedding,
        modelVersion: EMBEDDING_MODEL,
        updatedAt: new Date(),
      },
    });
}

/**
 * Delete the embedding for an idea (called when idea is deleted).
 */
export async function deleteIdeaEmbedding(ideaId: string): Promise<void> {
  await db.delete(ideaEmbeddings).where(eq(ideaEmbeddings.ideaId, ideaId));
}

/**
 * Sync embeddings for all ideas in a workspace that don't have one yet.
 * Returns the number of embeddings created.
 */
export async function syncWorkspaceEmbeddings(
  workspaceId: string
): Promise<number> {
  // Find ideas without embeddings (excluding MERGED status)
  const ideasWithoutEmbeddings = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      description: ideas.description,
      problemStatement: ideas.problemStatement,
    })
    .from(ideas)
    .leftJoin(ideaEmbeddings, eq(ideas.id, ideaEmbeddings.ideaId))
    .where(
      and(
        eq(ideas.workspaceId, workspaceId),
        isNull(ideaEmbeddings.id),
        ne(ideas.status, "MERGED")
      )
    );

  let created = 0;

  for (const idea of ideasWithoutEmbeddings) {
    try {
      await updateIdeaEmbedding(idea.id, idea.title, idea.problemStatement);
      created++;
    } catch (error) {
      console.error(`Failed to create embedding for idea ${idea.id}:`, error);
      // Continue with other ideas
    }
  }

  return created;
}
