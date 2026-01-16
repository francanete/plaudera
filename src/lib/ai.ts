import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

// Model configurations for Vercel AI SDK
export const models = {
  // Fast model for quick responses (chat, summaries)
  flash: google("gemini-2.0-flash"),
  // More capable model for complex reasoning
  pro: google("gemini-2.0-flash"),
};

export type ModelName = keyof typeof models;
