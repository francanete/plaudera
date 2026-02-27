import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

// Export the provider for embedding generation
export { google };

// Model configurations for Vercel AI SDK
export const models = {
  // Fast model for quick responses (chat, summaries)
  flash: google("gemini-2.0-flash"),
  // More capable model for complex reasoning
  pro: google("gemini-2.0-flash"),
};

export type ModelName = keyof typeof models;

// Re-export AI services for embeddings and similarity
export {
  generateEmbedding,
  updateIdeaEmbedding,
  deleteIdeaEmbedding,
  syncWorkspaceEmbeddings,
} from "./ai/embeddings";

export {
  findDuplicatesInWorkspace,
  createDuplicateSuggestions,
  findSimilarToIdea,
  SIMILARITY_THRESHOLD,
  MIN_IDEAS_FOR_DETECTION,
  type DuplicatePair,
  type SimilarIdea,
} from "./ai/similarity";
