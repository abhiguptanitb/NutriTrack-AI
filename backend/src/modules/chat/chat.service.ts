import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MealType } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { ReportService } from "../reports/report.service.js";
import { ChatRepository } from "./chat.repository.js";

type ChatIntent =
  | "CREATE_FOOD_ENTRY"
  | "GET_CURRENT_GOAL"
  | "GET_TODAY_PROGRESS"
  | "GET_WEEKLY_REPORT"
  | "NUTRITION_QUESTION"
  | "UNKNOWN";

type ClassifiedMessage = {
  intent: ChatIntent;
  foodName?: string;
  quantity?: number;
  unit?: string;
  mealType?: MealType;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  question?: string;
};

const chatRepository = new ChatRepository();
const dashboardService = new DashboardService();
const reportService = new ReportService();

const classificationPrompt = `
You are the intent classifier for NutriTrack AI. This is not a general chatbot.
Classify the user's message into exactly one supported intent:
CREATE_FOOD_ENTRY, GET_CURRENT_GOAL, GET_TODAY_PROGRESS, GET_WEEKLY_REPORT, NUTRITION_QUESTION, UNKNOWN.

Return ONLY valid JSON. Do not include markdown or prose.

For CREATE_FOOD_ENTRY, estimate nutrition and return:
{
  "intent": "CREATE_FOOD_ENTRY",
  "foodName": "",
  "quantity": 1,
  "unit": "serving",
  "mealType": "BREAKFAST",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0
}

Meal type must be one of BREAKFAST, LUNCH, DINNER, SNACKS.
Use today's date implicitly. Use grams for macro nutrients.
For nutrition advice, return {"intent":"NUTRITION_QUESTION","question":"..."}.
For unsupported requests, return {"intent":"UNKNOWN"}.
`;

export class ChatService {
  async handleMessage(userId: string, message: string) {
    const classification = await this.classifyMessage(message);

    switch (classification.intent) {
      case "CREATE_FOOD_ENTRY":
        return this.createFoodEntry(userId, classification);
      case "GET_CURRENT_GOAL":
        return this.getCurrentGoal(userId);
      case "GET_TODAY_PROGRESS":
        return this.getTodayProgress(userId);
      case "GET_WEEKLY_REPORT":
        return this.getWeeklyReport(userId);
      case "NUTRITION_QUESTION":
        return this.answerNutritionQuestion(message, classification.question);
      default:
        return {
          intent: "UNKNOWN" as const,
          reply: "I can help with meal logging, nutrition goals, today's progress, weekly calorie trends, and nutrition questions.",
          data: null
        };
    }
  }

  private async createFoodEntry(userId: string, classification: ClassifiedMessage) {
    const foodName = this.cleanText(classification.foodName, "Logged food");
    const quantity = this.cleanNumber(classification.quantity, 1);
    const mealType = this.cleanMealType(classification.mealType);

    const foodEntry = await chatRepository.createFoodEntry(userId, {
      foodName,
      quantity,
      unit: this.cleanText(classification.unit, "serving"),
      mealType,
      entryDate: new Date(),
      calories: Math.round(this.cleanNumber(classification.calories)),
      protein: this.cleanNumber(classification.protein),
      carbs: this.cleanNumber(classification.carbs),
      fat: this.cleanNumber(classification.fat),
      fiber: this.cleanNumber(classification.fiber),
      source: "MANUAL"
    });

    return {
      intent: "CREATE_FOOD_ENTRY" as const,
      reply: `Logged ${quantity} ${foodEntry.unit ?? "serving"} of ${foodEntry.foodName} for ${this.formatMealType(mealType)}.`,
      data: { foodEntry }
    };
  }

  private async getCurrentGoal(userId: string) {
    const goal = await chatRepository.getCurrentGoal(userId);

    if (!goal) {
      return {
        intent: "GET_CURRENT_GOAL" as const,
        reply: "You do not have an active nutrition goal yet. Create one from the Goals page to track progress.",
        data: { goal: null }
      };
    }

    return {
      intent: "GET_CURRENT_GOAL" as const,
      reply: `Your current daily goals are ${goal.dailyCalories} calories, ${Number(goal.proteinGrams)}g protein, ${Number(goal.carbGrams)}g carbs, and ${Number(goal.fatGrams)}g fat.`,
      data: { goal }
    };
  }

  private async getTodayProgress(userId: string) {
    const summary = await dashboardService.getSummary(userId);
    const remainingProtein = Math.max(summary.targets.protein - summary.consumed.protein, 0);

    return {
      intent: "GET_TODAY_PROGRESS" as const,
      reply: `Today you have consumed ${summary.consumed.calories} of ${summary.targets.calories} calories and ${summary.consumed.protein}g of ${summary.targets.protein}g protein. You still need about ${remainingProtein}g protein to hit your goal.`,
      data: { summary }
    };
  }

  private async getWeeklyReport(userId: string) {
    const { startDate, endDate } = this.currentWeekRange();
    const trend = await reportService.weeklyCalories(userId, startDate, endDate);
    const totalCalories = trend.reduce((sum, day) => sum + day.calories, 0);
    const averageCalories = trend.length ? Math.round(totalCalories / trend.length) : 0;

    return {
      intent: "GET_WEEKLY_REPORT" as const,
      reply: `Your weekly calorie total is ${totalCalories} calories, averaging ${averageCalories} calories per day.`,
      data: { trend, totalCalories, averageCalories }
    };
  }

  private async answerNutritionQuestion(originalMessage: string, question?: string) {
    const answer = await this.askGemini(
      `Answer this nutrition question in a concise, practical way. Include a short safety note if the answer depends on health status. Question: ${question ?? originalMessage}`
    );

    return {
      intent: "NUTRITION_QUESTION" as const,
      reply: answer,
      data: null
    };
  }

  private async classifyMessage(message: string): Promise<ClassifiedMessage> {
    const text = await this.askGemini(`${classificationPrompt}\nUser message: ${message}`);
    const parsed = this.parseJson(text);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { intent: "UNKNOWN" };
    }

    const intent = String((parsed as Record<string, unknown>).intent ?? "UNKNOWN") as ChatIntent;
    const supported: ChatIntent[] = [
      "CREATE_FOOD_ENTRY",
      "GET_CURRENT_GOAL",
      "GET_TODAY_PROGRESS",
      "GET_WEEKLY_REPORT",
      "NUTRITION_QUESTION",
      "UNKNOWN"
    ];

    if (!supported.includes(intent)) {
      return { intent: "UNKNOWN" };
    }

    return { ...(parsed as Record<string, unknown>), intent } as ClassifiedMessage;
  }

  private async askGemini(prompt: string) {
    if (!env.GEMINI_API_KEY) {
      throw new AppError("Gemini API key is not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  private parseJson(text: string): unknown {
    const withoutFences = text.replace(/```json|```/gi, "").trim();
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return { intent: "UNKNOWN" };
    }

    try {
      return JSON.parse(withoutFences.slice(start, end + 1));
    } catch {
      return { intent: "UNKNOWN" };
    }
  }

  private cleanText(value: unknown, fallback: string) {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 120) : fallback;
  }

  private cleanNumber(value: unknown, fallback = 0) {
    const numberValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      return fallback;
    }

    return Number(numberValue.toFixed(2));
  }

  private cleanMealType(value: unknown): MealType {
    const mealType = String(value ?? "").toUpperCase();
    const allowed: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
    return allowed.includes(mealType as MealType) ? (mealType as MealType) : "SNACKS";
  }

  private formatMealType(mealType: MealType) {
    return mealType.toLowerCase();
  }

  private currentWeekRange() {
    const today = new Date();
    const startDate = new Date(today);
    const day = startDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startDate.setDate(startDate.getDate() + diffToMonday);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }
}
