import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { sendChatMessage } from "./chat.api";
import { CHAT_HISTORY_KEY_PREFIX, type ChatMessage } from "./chat.types";

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

function loadMessages(storageKey: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return [welcomeMessage];
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [welcomeMessage];
    }

    const messages = parsed.filter(
      (item): item is ChatMessage =>
        Boolean(item) &&
        typeof item === "object" &&
        "id" in item &&
        "role" in item &&
        "content" in item &&
        typeof item.id === "string" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    );

    return messages.length ? messages.slice(-50) : [welcomeMessage];
  } catch {
    return [welcomeMessage];
  }
}

export function ChatPage() {
  const { user } = useAuth();
  const storageKey = user ? `${CHAT_HISTORY_KEY_PREFIX}${user.id}` : CHAT_HISTORY_KEY_PREFIX;
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(storageKey));
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedMessages = loadMessages(storageKey);
    setMessages(storedMessages);
  }, [storageKey]);

  useEffect(() => {
    const history = messages.filter((item) => item.id !== welcomeMessage.id).slice(-50);
    if (history.length) {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
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

  function clearChat() {
    localStorage.removeItem(storageKey);
    setMessages([welcomeMessage]);
    setMessage("");
    setError("");
  }

  return (
    <div className="grid min-h-0 gap-6 xl:h-[calc(100vh-9rem)] xl:grid-cols-[minmax(260px,0.36fr)_minmax(0,1fr)]">
      <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
        <div>
          <p className="page-kicker">Your nutrition copilot</p>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-description">
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

      <Card className="flex h-[calc(100vh-9rem)] min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Conversational Nutrition Assistant
            </CardTitle>
            <Button onClick={clearChat} size="sm" type="button" variant="outline">
              Clear Chat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scroll-smooth p-4 md:p-6" ref={messagesRef}>
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
                  <p className="whitespace-pre-line">{item.role === "assistant" ? cleanAssistantResponse(item.content) : item.content}</p>
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

          </div>

          {error ? <div className="shrink-0 border-t px-4 py-3 text-sm text-destructive md:px-6">{error}</div> : null}

          <form className="sticky bottom-0 shrink-0 border-t bg-card p-4 md:p-6" onSubmit={handleSubmit}>
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

function cleanAssistantResponse(content: string) {
  return content
    .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*([-*_]){3,}\s*$/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
