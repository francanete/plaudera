import { embed } from "ai";
import { eq, isNull, and, ne } from "drizzle-orm";
import { google } from "@/lib/ai";
import { db, ideaEmbeddings, ideas } from "@/lib/db";

// Configuration
const EMBEDDING_MODEL = "text-embedding-004";

/**
 * Generate an embedding vector for the given text using Google's text-embedding-004 model.
 * Returns a 768-dimensional vector for cosine similarity search.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
  });
  return embedding;
}

/**
 * Create or update the embedding for an idea.
 * Uses title only for consistent duplicate detection across all ideas.
 */
export async function updateIdeaEmbedding(
  ideaId: string,
  title: string,
  problemStatement?: string | null
): Promise<void> {
  // Combine title with problem statement for richer embedding when available
  const textToEmbed = problemStatement
    ? `${title}\n\n${problemStatement}`
    : title;
  const embedding = await generateEmbedding(textToEmbed);

  // Upsert the embedding
  await db
    .insert(ideaEmbeddings)
    .values({
      ideaId,
      embedding,
      modelVersion: EMBEDDING_MODEL,
    })
    .onConflictDoUpdate({
      target: ideaEmbeddings.ideaId,
      set: {
        embedding,
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
