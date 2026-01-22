import { cosineDistance, sql, eq, and, ne, desc, gt } from "drizzle-orm";
import { db, ideaEmbeddings, ideas, duplicateSuggestions } from "@/lib/db";

// Configuration
export const SIMILARITY_THRESHOLD = 0.82; // 82% similarity (cosine distance < 0.18)
export const MIN_IDEAS_FOR_DETECTION = 5;

export interface DuplicatePair {
  sourceIdeaId: string;
  duplicateIdeaId: string;
  similarity: number; // 0-100 percentage
}

/**
 * Find potential duplicate pairs in a workspace using vector similarity.
 * Compares all ideas (except MERGED) and returns pairs above the similarity threshold.
 * Source idea is always the older one (by createdAt).
 */
export async function findDuplicatesInWorkspace(
  workspaceId: string
): Promise<DuplicatePair[]> {
  // Get all ideas with embeddings for this workspace (excluding MERGED)
  const ideasWithEmbeddings = await db
    .select({
      id: ideas.id,
      createdAt: ideas.createdAt,
      embedding: ideaEmbeddings.embedding,
    })
    .from(ideas)
    .innerJoin(ideaEmbeddings, eq(ideas.id, ideaEmbeddings.ideaId))
    .where(and(eq(ideas.workspaceId, workspaceId), ne(ideas.status, "MERGED")));

  if (ideasWithEmbeddings.length < MIN_IDEAS_FOR_DETECTION) {
    return [];
  }

  // Get existing suggestions for this workspace (any status) to skip re-comparing
  const existingSuggestions = await db
    .select({
      sourceIdeaId: duplicateSuggestions.sourceIdeaId,
      duplicateIdeaId: duplicateSuggestions.duplicateIdeaId,
    })
    .from(duplicateSuggestions)
    .where(eq(duplicateSuggestions.workspaceId, workspaceId));

  const existingPairs = new Set(
    existingSuggestions.map((s) => `${s.sourceIdeaId}:${s.duplicateIdeaId}`)
  );

  const pairs: DuplicatePair[] = [];

  // Compare each pair of ideas using pgvector cosine distance
  for (let i = 0; i < ideasWithEmbeddings.length; i++) {
    const ideaA = ideasWithEmbeddings[i];

    // Use pgvector to find similar ideas for this embedding
    const similarIdeas = await db
      .select({
        id: ideas.id,
        createdAt: ideas.createdAt,
        similarity: sql<number>`1 - (${cosineDistance(ideaEmbeddings.embedding, ideaA.embedding)})`,
      })
      .from(ideas)
      .innerJoin(ideaEmbeddings, eq(ideas.id, ideaEmbeddings.ideaId))
      .where(
        and(
          eq(ideas.workspaceId, workspaceId),
          ne(ideas.status, "MERGED"),
          ne(ideas.id, ideaA.id), // Don't compare with self
          gt(
            sql<number>`1 - (${cosineDistance(ideaEmbeddings.embedding, ideaA.embedding)})`,
            SIMILARITY_THRESHOLD
          )
        )
      )
      .orderBy(
        desc(
          sql`1 - (${cosineDistance(ideaEmbeddings.embedding, ideaA.embedding)})`
        )
      );

    for (const similar of similarIdeas) {
      // Determine source (older) and duplicate (newer)
      const isAOlder = ideaA.createdAt <= similar.createdAt;
      const sourceId = isAOlder ? ideaA.id : similar.id;
      const duplicateId = isAOlder ? similar.id : ideaA.id;

      // Skip if we already have a suggestion for this pair (in either direction)
      const pairKey = `${sourceId}:${duplicateId}`;
      const reversePairKey = `${duplicateId}:${sourceId}`;
      if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) {
        continue;
      }

      // Skip if we already added this pair in this run
      const alreadyAdded = pairs.some(
        (p) =>
          (p.sourceIdeaId === sourceId && p.duplicateIdeaId === duplicateId) ||
          (p.sourceIdeaId === duplicateId && p.duplicateIdeaId === sourceId)
      );
      if (alreadyAdded) {
        continue;
      }

      pairs.push({
        sourceIdeaId: sourceId,
        duplicateIdeaId: duplicateId,
        similarity: Math.round(similar.similarity * 100),
      });
    }
  }

  return pairs;
}

/**
 * Create duplicate suggestions for the found pairs.
 * Returns the number of suggestions created.
 */
export async function createDuplicateSuggestions(
  workspaceId: string,
  pairs: DuplicatePair[]
): Promise<number> {
  if (pairs.length === 0) {
    return 0;
  }

  let created = 0;

  for (const pair of pairs) {
    try {
      await db
        .insert(duplicateSuggestions)
        .values({
          workspaceId,
          sourceIdeaId: pair.sourceIdeaId,
          duplicateIdeaId: pair.duplicateIdeaId,
          similarity: pair.similarity,
          status: "PENDING",
        })
        .onConflictDoNothing(); // Skip if pair already exists

      created++;
    } catch (error) {
      console.error(
        `Failed to create suggestion for pair ${pair.sourceIdeaId}:${pair.duplicateIdeaId}:`,
        error
      );
    }
  }

  return created;
}
