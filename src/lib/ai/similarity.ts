import { sql, eq } from "drizzle-orm";
import { db, duplicateSuggestions } from "@/lib/db";

// Configuration
// 55% similarity threshold; lower values catch more potential duplicates but increase false positives
export const SIMILARITY_THRESHOLD = 0.55;
export const MIN_IDEAS_FOR_DETECTION = 5;

export interface DuplicatePair {
  sourceIdeaId: string;
  duplicateIdeaId: string;
  similarity: number; // 0-100 percentage
}

/**
 * Find potential duplicate pairs in a workspace using vector similarity.
 * Compares all ideas (except MERGED) and returns pairs above the similarity threshold.
 * Excludes roadmap-vs-roadmap pairs (both ideas have roadmapStatus != 'NONE'),
 * since the owner has already triaged those as distinct.
 * Source idea is always the older one (by createdAt).
 */
export async function findDuplicatesInWorkspace(
  workspaceId: string
): Promise<DuplicatePair[]> {
  // Quick count check to avoid expensive self-join on small workspaces
  const [{ count }] = await db
    .execute(
      sql`
    SELECT count(*)::int AS count
    FROM ideas i
    INNER JOIN idea_embeddings ie ON ie.idea_id = i.id
    WHERE i.workspace_id = ${workspaceId} AND i.status != 'MERGED'
  `
    )
    .then((r) => r.rows as { count: number }[]);

  if (count < MIN_IDEAS_FOR_DETECTION) {
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

  // Single self-join query: compute all above-threshold pairs in one round trip.
  // The condition b.id > a.id ensures each pair is computed exactly once.
  // Uses weighted similarity (70% title + 30% problem) when both have problem embeddings.
  const similarPairs = await db.execute(sql`
    SELECT
      a_idea.id AS idea_a_id,
      a_idea.created_at AS idea_a_created_at,
      b_idea.id AS idea_b_id,
      b_idea.created_at AS idea_b_created_at,
      CASE WHEN a_emb.problem_embedding IS NOT NULL AND b_emb.problem_embedding IS NOT NULL
        THEN 0.7 * (1 - (a_emb.embedding <=> b_emb.embedding)) + 0.3 * (1 - (a_emb.problem_embedding <=> b_emb.problem_embedding))
        ELSE 1 - (a_emb.embedding <=> b_emb.embedding)
      END AS similarity
    FROM ideas a_idea
    INNER JOIN idea_embeddings a_emb ON a_emb.idea_id = a_idea.id
    INNER JOIN ideas b_idea
      ON b_idea.workspace_id = a_idea.workspace_id
      AND b_idea.id > a_idea.id
      AND b_idea.status != 'MERGED'
    INNER JOIN idea_embeddings b_emb ON b_emb.idea_id = b_idea.id
    WHERE a_idea.workspace_id = ${workspaceId}
      AND a_idea.status != 'MERGED'
      AND b_idea.status != 'MERGED'
      AND (a_idea.roadmap_status = 'NONE' OR b_idea.roadmap_status = 'NONE')
      AND CASE WHEN a_emb.problem_embedding IS NOT NULL AND b_emb.problem_embedding IS NOT NULL
        THEN 0.7 * (1 - (a_emb.embedding <=> b_emb.embedding)) + 0.3 * (1 - (a_emb.problem_embedding <=> b_emb.problem_embedding))
        ELSE 1 - (a_emb.embedding <=> b_emb.embedding)
      END > ${SIMILARITY_THRESHOLD}
    ORDER BY similarity DESC
  `);

  // Post-process: determine source/duplicate by createdAt, filter existing pairs
  const pairs: DuplicatePair[] = [];

  for (const row of similarPairs.rows as {
    idea_a_id: string;
    idea_a_created_at: Date;
    idea_b_id: string;
    idea_b_created_at: Date;
    similarity: number;
  }[]) {
    const aIsOlder = row.idea_a_created_at <= row.idea_b_created_at;
    const sourceId = aIsOlder ? row.idea_a_id : row.idea_b_id;
    const duplicateId = aIsOlder ? row.idea_b_id : row.idea_a_id;

    // Skip if a suggestion already exists for this pair (in either direction)
    if (
      existingPairs.has(`${sourceId}:${duplicateId}`) ||
      existingPairs.has(`${duplicateId}:${sourceId}`)
    ) {
      continue;
    }

    pairs.push({
      sourceIdeaId: sourceId,
      duplicateIdeaId: duplicateId,
      similarity: Math.round(row.similarity * 100),
    });
  }

  return pairs;
}

export interface SimilarIdea {
  ideaId: string;
  title: string;
  voteCount: number;
  similarity: number; // 0-100 percentage
}

/**
 * Find ideas similar to a given idea within the same workspace.
 * Returns top N PUBLISHED ideas above threshold, using weighted similarity.
 */
export async function findSimilarToIdea(
  ideaId: string,
  workspaceId: string,
  limit: number = 3
): Promise<SimilarIdea[]> {
  const results = await db.execute(sql`
    SELECT
      other.id AS idea_id,
      other.title,
      other.vote_count,
      CASE WHEN src_emb.problem_embedding IS NOT NULL AND other_emb.problem_embedding IS NOT NULL
        THEN 0.7 * (1 - (src_emb.embedding <=> other_emb.embedding)) + 0.3 * (1 - (src_emb.problem_embedding <=> other_emb.problem_embedding))
        ELSE 1 - (src_emb.embedding <=> other_emb.embedding)
      END AS similarity
    FROM idea_embeddings src_emb
    INNER JOIN ideas other
      ON other.workspace_id = ${workspaceId}
      AND other.id != ${ideaId}
      AND other.status = 'PUBLISHED'
    INNER JOIN idea_embeddings other_emb ON other_emb.idea_id = other.id
    WHERE src_emb.idea_id = ${ideaId}
      AND CASE WHEN src_emb.problem_embedding IS NOT NULL AND other_emb.problem_embedding IS NOT NULL
        THEN 0.7 * (1 - (src_emb.embedding <=> other_emb.embedding)) + 0.3 * (1 - (src_emb.problem_embedding <=> other_emb.problem_embedding))
        ELSE 1 - (src_emb.embedding <=> other_emb.embedding)
      END > ${SIMILARITY_THRESHOLD}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);

  return (
    results.rows as {
      idea_id: string;
      title: string;
      vote_count: number;
      similarity: number;
    }[]
  ).map((row) => ({
    ideaId: row.idea_id,
    title: row.title,
    voteCount: row.vote_count,
    similarity: Math.round(row.similarity * 100),
  }));
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
