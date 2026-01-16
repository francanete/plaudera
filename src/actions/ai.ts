"use server";

import { generateText } from "ai";
import { models, type ModelName } from "@/lib/ai";
import { checkAIRateLimit } from "@/lib/rate-limit";
import { trackAIUsage } from "@/lib/ai-usage";
import { requirePaidAccess, AuthError } from "@/lib/dal";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; resetAt?: Date };

export async function summarizeText(
  text: string
): Promise<ActionResult<string>> {
  try {
    const { userId, plan } = await requirePaidAccess();

    // Rate limit check using actual plan
    const rateLimit = await checkAIRateLimit(userId, plan);

    if (!rateLimit.success) {
      return {
        success: false,
        error: "Rate limit exceeded. Please wait a moment.",
        resetAt: rateLimit.resetAt,
      };
    }

    const startTime = Date.now();
    const {
      text: summary,
      usage,
      finishReason,
    } = await generateText({
      model: models.flash,
      prompt: `Summarize the following text in 2-3 sentences:\n\n${text}`,
    });

    // Fire-and-forget token tracking
    trackAIUsage({
      userId,
      model: "flash",
      feature: "summarize",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      finishReason,
      durationMs: Date.now() - startTime,
    });

    return { success: true, data: summary };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message };
    }
    console.error("Summarization failed:", error);
    return { success: false, error: "Failed to generate summary" };
  }
}

export async function generateContent(
  prompt: string,
  model: ModelName = "flash"
): Promise<ActionResult<string>> {
  try {
    const { userId, plan } = await requirePaidAccess();

    // Rate limit check using actual plan
    const rateLimit = await checkAIRateLimit(userId, plan);

    if (!rateLimit.success) {
      return {
        success: false,
        error: "Rate limit exceeded. Please wait a moment.",
        resetAt: rateLimit.resetAt,
      };
    }

    const startTime = Date.now();
    const { text, usage, finishReason } = await generateText({
      model: models[model],
      prompt,
    });

    // Fire-and-forget token tracking
    trackAIUsage({
      userId,
      model,
      feature: "generate",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      finishReason,
      durationMs: Date.now() - startTime,
    });

    return { success: true, data: text };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message };
    }
    console.error("Generation failed:", error);
    return { success: false, error: "Failed to generate content" };
  }
}
