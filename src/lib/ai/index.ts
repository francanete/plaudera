// AI services for embedding generation and similarity search
export {
  generateEmbedding,
  updateIdeaEmbedding,
  deleteIdeaEmbedding,
  syncWorkspaceEmbeddings,
  normalizeProblemSummary,
} from "./embeddings";

export {
  findDuplicatesInWorkspace,
  createDuplicateSuggestions,
  findSimilarToIdea,
  SIMILARITY_THRESHOLD,
  MIN_IDEAS_FOR_DETECTION,
  type DuplicatePair,
  type SimilarIdea,
} from "./similarity";
