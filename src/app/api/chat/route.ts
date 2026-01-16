import { streamText } from "ai";
import { models, type ModelName } from "@/lib/ai";
import { trackAIUsage } from "@/lib/ai-usage";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { BadRequestError } from "@/lib/errors";
import { appConfig } from "@/lib/config";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Server-side system prompt (never sent from client)
const SYSTEM_PROMPT = `You are a helpful assistant for ${appConfig.name}, a SaaS application.

PRICING:
- Free plan: Up to 3 projects, basic analytics, community support
- Pro Monthly: $19/month - Unlimited projects, advanced analytics, priority support
- Pro Annual: $190/year (save 17%)

SUPPORT:
- Free users: Community support
- Pro users: Priority email support

Be helpful, concise, and friendly.`;

export const POST = protectedApiRouteWrapper(
  async (request, { session }) => {
    const { messages, model = "flash" } = await request.json();

    if (!(model in models)) {
      throw new BadRequestError("Invalid model");
    }

    // Convert UIMessage format (parts) to ModelMessage format (content)
    const modelMessages = messages.map(
      (msg: {
        role: string;
        parts?: { type: string; text: string }[];
        content?: string;
      }) => ({
        role: msg.role,
        content:
          msg.parts
            ?.filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("") ??
          msg.content ??
          "",
      })
    );

    const startTime = Date.now();
    const result = streamText({
      model: models[model as ModelName],
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      onFinish: ({ usage, finishReason }) => {
        // True fire-and-forget token tracking (no await)
        trackAIUsage({
          userId: session.user.id,
          model: model as ModelName,
          feature: "chat",
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
          finishReason,
          durationMs: Date.now() - startTime,
        }).catch(() => {});
      },
    });

    return result.toUIMessageStreamResponse();
  },
  { rateLimit: true }
);
