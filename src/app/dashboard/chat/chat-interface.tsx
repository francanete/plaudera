"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, AlertCircle } from "lucide-react";
import { handleRateLimitError } from "@/lib/handle-rate-limit-error";

export function ChatInterface() {
  const [input, setInput] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, options) => {
        setIsRateLimited(false);
        const response = await fetch(url, options);

        if (response.status === 429) {
          const data = await response.clone().json();
          setIsRateLimited(true);
          handleRateLimitError({
            resetAt: data.resetAt,
          });
        }

        return response;
      },
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(
      { text: input },
      {
        body: { model: "flash" },
      }
    );
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h1 className="mb-4 text-2xl font-bold">AI Assistant</h1>

      {/* Error display (rate limit errors handled via toast) */}
      {error && !isRateLimited && (
        <div className="bg-destructive/10 text-destructive mb-4 flex items-center gap-2 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {error.message || "Something went wrong. Please try again."}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="mb-4 flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && !error && (
          <p className="text-muted-foreground py-8 text-center">
            Ask me anything about Pilotes - pricing, features, or support!
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-3 ${
              m.role === "user"
                ? "bg-primary text-primary-foreground ml-auto max-w-[80%]"
                : "bg-muted max-w-[80%]"
            }`}
          >
            {m.parts.map((part, i) =>
              part.type === "text" ? <span key={i}>{part.text}</span> : null
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about pricing, features, or support..."
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
