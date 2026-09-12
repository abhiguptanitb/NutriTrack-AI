export type ChatIntent =
  | "CREATE_FOOD_ENTRY"
  | "GET_CURRENT_GOAL"
  | "GET_TODAY_PROGRESS"
  | "GET_WEEKLY_REPORT"
  | "NUTRITION_QUESTION"
  | "UNKNOWN";

export type ChatResponse = {
  intent: ChatIntent;
  reply: string;
  data: unknown;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: ChatIntent;
};
