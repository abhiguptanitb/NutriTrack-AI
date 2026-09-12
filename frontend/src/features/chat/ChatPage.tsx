import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sendChatMessage } from "./chat.api";
import type { ChatMessage } from "./chat.types";

const examples = [
  "Log 2 bananas for breakfast",
  "What are my nutrition goals?",
  "How many calories have I consumed today?",
  "Show my weekly calorie trend"
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I can help you log meals, check goals, summarize today's progress, show weekly calorie trends, and answer nutrition questions."
};

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const response = await sendChatMessage(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply,
          intent: response.intent
        }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  }

  function useExample(example: string) {
    setMessage(example);
    setError("");
  }

  return (
    <div className="grid min-h-[calc(100vh-9rem)] gap-6 xl:grid-cols-[minmax(260px,0.36fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">AI Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use natural language to work with meals, goals, progress, reports, and nutrition guidance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Try asking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {examples.map((example) => (
              <button
                className="w-full rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                key={example}
                type="button"
                onClick={() => useExample(example)}
              >
                {example}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Log meals from short text prompts.</p>
            <p>Check current nutrition goals.</p>
            <p>Summarize calories and macros consumed today.</p>
            <p>Review weekly calorie performance.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex min-h-[620px] flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Conversational Nutrition Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {messages.map((item) => (
              <div className={cn("flex gap-3", item.role === "user" && "justify-end")} key={item.id}>
                {item.role === "assistant" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] rounded-md px-4 py-3 text-sm leading-6",
                    item.role === "assistant" ? "border bg-card" : "bg-primary text-primary-foreground"
                  )}
                >
                  <p>{item.content}</p>
                  {item.intent ? <p className="mt-2 text-xs opacity-70">Intent: {formatIntent(item.intent)}</p> : null}
                </div>
                {item.role === "user" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <UserRound className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            ))}

            {isSending ? (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking through the request...
                </div>
              </div>
            ) : null}

            <div ref={scrollRef} />
          </div>

          {error ? <div className="border-t px-4 py-3 text-sm text-destructive md:px-6">{error}</div> : null}

          <form className="border-t p-4 md:p-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                className="min-h-20 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Ask NutriTrack AI to log a meal, check progress, or answer a nutrition question..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <Button className="md:self-end" disabled={isSending || !message.trim()} type="submit">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function formatIntent(intent: string) {
  return intent
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
