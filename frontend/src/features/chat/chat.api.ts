import { apiRequest } from "@/api/client";
import type { ChatResponse } from "./chat.types";

export function sendChatMessage(message: string) {
  return apiRequest<ChatResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}
