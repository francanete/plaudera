// AI services for embedding generation and similarity search
export {
  generateEmbedding,
  updateIdeaEmbedding,
  deleteIdeaEmbedding,
  syncWorkspaceEmbeddings,
} from "./embeddings";

export {
  findDuplicatesInWorkspace,
  createDuplicateSuggestions,
  SIMILARITY_THRESHOLD,
  MIN_IDEAS_FOR_DETECTION,
  type DuplicatePair,
} from "./similarity";
