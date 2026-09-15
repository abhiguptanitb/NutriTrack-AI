import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MealType } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { ReportService } from "../reports/report.service.js";
import { parseEntryDateTime, assertEntryDateTimeNotFuture } from "../../utils/entryDateTime.js";
import { ChatRepository } from "./chat.repository.js";

type ChatIntent =
  | "CREATE_FOOD_ENTRY"
  | "GET_CURRENT_GOAL"
  | "GET_TODAY_PROGRESS"
  | "GET_WEEKLY_REPORT"
  | "LIST_MEALS"
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
  date?: string;
  time?: string;
  startDate?: string;
  endDate?: string;
  relativeRange?: "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_WEEK";
  question?: string;
};

const chatRepository = new ChatRepository();
const dashboardService = new DashboardService();
const reportService = new ReportService();

const classificationPrompt = `
You are the intent classifier for NutriTrack AI. This is not a general chatbot.
Classify the user's message into exactly one supported intent:
CREATE_FOOD_ENTRY, GET_CURRENT_GOAL, GET_TODAY_PROGRESS, GET_WEEKLY_REPORT, LIST_MEALS, NUTRITION_QUESTION, UNKNOWN.

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
  "fiber": 0,
  "date": null,
  "time": null
}

Meal type must be one of BREAKFAST, LUNCH, DINNER, SNACKS.
If the user explicitly provides a date or time, extract it exactly into date and time.
Return date as YYYY-MM-DD when possible and time as HH:mm in 24-hour format. Convert AM/PM times to 24-hour time.
If either value is not provided, return null for that field. Use grams for macro nutrients.
Use GET_WEEKLY_REPORT only for weekly calorie trend, weekly summary, weekly report, average calories this week, or calories over the last 7 days.
Use LIST_MEALS when the user asks to see actual food entries, meals, meal history, today's entries, breakfast entries, or meals from a date range. LIST_MEALS must return database entries, not calorie summaries.
For LIST_MEALS, return optional filters in this shape:
{"intent":"LIST_MEALS","relativeRange":null,"startDate":null,"endDate":null,"mealType":null}
Use relativeRange TODAY, YESTERDAY, LAST_7_DAYS, or THIS_WEEK for relative requests. Use YYYY-MM-DD dates for explicit date filters. Never classify a request for actual meals as GET_WEEKLY_REPORT.
For nutrition advice, return {"intent":"NUTRITION_QUESTION","question":"..."}.
For unsupported requests, return {"intent":"UNKNOWN"}.
`;

export class ChatService {
  async handleMessage(userId: string, message: string) {
    // The assistant first resolves a narrow product intent, then routes to deterministic app workflows.
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
      case "LIST_MEALS":
        return this.listMeals(userId, classification, message);
      case "NUTRITION_QUESTION":
        return this.answerNutritionQuestion(message, classification.question);
      default:
        return {
          intent: "UNKNOWN" as const,
          reply: "I can help with meal logging, listing meals, nutrition goals, today's progress, weekly calorie trends, and nutrition questions.",
          data: null
        };
    }
  }

  private async createFoodEntry(userId: string, classification: ClassifiedMessage) {
    const foodName = this.cleanText(classification.foodName, "Logged food");
    const quantity = this.cleanNumber(classification.quantity, 1);
    const mealType = this.cleanMealType(classification.mealType);
    const entryDate = parseEntryDateTime(classification.date, classification.time);
    assertEntryDateTimeNotFuture(entryDate);

    const foodEntry = await chatRepository.createFoodEntry(userId, {
      foodName,
      quantity,
      unit: this.cleanText(classification.unit, "serving"),
      mealType,
      entryDate,
      calories: Math.round(this.cleanNumber(classification.calories)),
      protein: this.cleanNumber(classification.protein),
      carbs: this.cleanNumber(classification.carbs),
      fat: this.cleanNumber(classification.fat),
      fiber: this.cleanNumber(classification.fiber),
      // Assistant-created entries keep their origin even if the user edits the meal later.
      source: "AI_ASSISTANT"
    });

    return {
      intent: "CREATE_FOOD_ENTRY" as const,
      reply: `Logged ${quantity} ${foodEntry.unit ?? "serving"} of ${foodEntry.foodName} for ${this.formatMealType(mealType)}.`,
      data: { foodEntry }
    };
  }

  private async getCurrentGoal(userId: string) {
    const summary = await dashboardService.getSummary(userId);
    const goal = summary.goal;

    if (!goal) {
      return {
        intent: "GET_CURRENT_GOAL" as const,
        reply: "You do not have an active nutrition goal yet. Create one from the Goals page to track progress.",
        data: { goal: null }
      };
    }

    const { consumed, targets, progress } = summary;
    const reply = [
      "Daily Nutrition Goals",
      "",
      "🎯 Targets",
      `• Calories: ${this.formatAmount(targets.calories)} kcal`,
      `• Protein: ${this.formatAmount(targets.protein)}g`,
      `• Carbs: ${this.formatAmount(targets.carbs)}g`,
      `• Fat: ${this.formatAmount(targets.fat)}g`,
      "",
      "📊 Current Progress",
      `• Calories: ${this.formatAmount(consumed.calories)} / ${this.formatAmount(targets.calories)} kcal (${progress.calories}%)`,
      `• Protein: ${this.formatAmount(consumed.protein)} / ${this.formatAmount(targets.protein)}g (${progress.protein}%)`,
      `• Carbs: ${this.formatAmount(consumed.carbs)} / ${this.formatAmount(targets.carbs)}g (${progress.carbs}%)`,
      `• Fat: ${this.formatAmount(consumed.fat)} / ${this.formatAmount(targets.fat)}g (${progress.fat}%)`,
      "",
      "📈 Status",
      `• Calories: ${this.formatGoalStatus(consumed.calories, targets.calories, "kcal")}`,
      `• Protein: ${this.formatGoalStatus(consumed.protein, targets.protein, "g")}`,
      `• Carbs: ${this.formatGoalStatus(consumed.carbs, targets.carbs, "g")}`,
      `• Fat: ${this.formatGoalStatus(consumed.fat, targets.fat, "g")}`
    ].join("\n");

    return {
      intent: "GET_CURRENT_GOAL" as const,
      reply,
      data: { goal, summary }
    };
  }

  private async getTodayProgress(userId: string) {
    const summary = await dashboardService.getSummary(userId);
    const proteinDifference = summary.consumed.protein - summary.targets.protein;
    const proteinProgressMessage = proteinDifference > 0
      ? `You have exceeded your protein goal by ${this.formatAmount(proteinDifference)}g.`
      : `You still need about ${this.formatAmount(Math.abs(proteinDifference))}g protein to hit your goal.`;

    return {
      intent: "GET_TODAY_PROGRESS" as const,
      reply: `Today you have consumed ${summary.consumed.calories} of ${summary.targets.calories} calories and ${summary.consumed.protein}g of ${summary.targets.protein}g protein. ${proteinProgressMessage}`,
      data: { summary }
    };
  }

  private async getWeeklyReport(userId: string) {
    const { startDate, endDate } = this.lastSevenDaysRange();
    const { trend, totalCalories, averageCalories, reportingDays, totalProtein, totalCarbs, totalFat, mealCount } = await reportService.weeklyCalorieSummary(
      userId,
      startDate,
      endDate
    );

    return {
      intent: "GET_WEEKLY_REPORT" as const,
      reply: `Your last ${reportingDays} days contain ${totalCalories} calories from ${mealCount} logged meals, averaging ${averageCalories} calories per day. Total macros: ${totalProtein}g protein, ${totalCarbs}g carbs, and ${totalFat}g fat.`,
      data: { trend, totalCalories, averageCalories, reportingDays, totalProtein, totalCarbs, totalFat, mealCount }
    };
  }

  private async listMeals(userId: string, classification: ClassifiedMessage, originalMessage: string) {
    const { startDate, endDate, resolvedDate, latestEntryDate } = await this.mealListRange(
      userId,
      classification,
      this.inferRelativeRange(originalMessage)
    );
    const meals = await chatRepository.listFoodEntries(userId, {
      startDate,
      endDate,
      mealType: this.cleanOptionalMealType(classification.mealType)
    });

    console.debug("Meal query", {
      "Resolved intent": classification.intent,
      "Resolved date": resolvedDate ? this.formatDate(resolvedDate) : `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
      "Latest entry date": latestEntryDate ? this.formatDate(latestEntryDate) : null,
      "Entries found": meals.length
    });

    return {
      intent: "LIST_MEALS" as const,
      reply: meals.length
        ? meals
            .map(
              (meal) =>
                `${this.formatMealType(meal.mealType)} | ${meal.foodName} | ${meal.calories} kcal | ${this.formatDateTime(meal.entryDate)}`
            )
            .join("\n")
        : resolvedDate
          ? `No meals were logged on ${this.formatDate(resolvedDate)}.`
          : "No logged meals matched your request.",
      data: { meals }
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
      "LIST_MEALS",
      "NUTRITION_QUESTION",
      "UNKNOWN"
    ];

    if (!supported.includes(intent)) {
      // Unknown intents are rejected instead of being allowed to call arbitrary workflows.
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

  private formatAmount(value: number) {
    return Number(value.toFixed(1)).toString();
  }

  private formatGoalStatus(consumed: number, target: number, unit: string) {
    const difference = consumed - target;
    return difference > 0
      ? `Exceeded by ${this.formatAmount(difference)} ${unit}`
      : `Remaining ${this.formatAmount(Math.abs(difference))} ${unit}`;
  }

  private cleanMealType(value: unknown): MealType {
    const mealType = String(value ?? "").toUpperCase();
    const allowed: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
    return allowed.includes(mealType as MealType) ? (mealType as MealType) : "SNACKS";
  }

  private cleanOptionalMealType(value: unknown): MealType | undefined {
    const mealType = String(value ?? "").toUpperCase();
    const allowed: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
    return allowed.includes(mealType as MealType) ? (mealType as MealType) : undefined;
  }

  private async mealListRange(
    userId: string,
    classification: ClassifiedMessage,
    inferredRange?: ClassifiedMessage["relativeRange"]
  ) {
    const today = new Date();
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);

    const bounds = await chatRepository.foodEntryDateBounds(userId);
    const latestEntryDate = bounds._max.entryDate ?? undefined;
    const referenceDate = this.getReferenceDate(bounds._min.entryDate, latestEntryDate, today);

    // Relative requests use the latest seeded data in development, but real current dates in production.
    const relativeRange = inferredRange ?? classification.relativeRange;
    if (relativeRange) {
      const resolvedDate = new Date(referenceDate);
      resolvedDate.setHours(0, 0, 0, 0);

      if (relativeRange === "TODAY") {
        return { startDate: resolvedDate, endDate: this.endOfDay(resolvedDate), resolvedDate, latestEntryDate };
      }

      if (relativeRange === "YESTERDAY") {
        resolvedDate.setDate(resolvedDate.getDate() - 1);
        return { startDate: resolvedDate, endDate: this.endOfDay(resolvedDate), resolvedDate, latestEntryDate };
      }

      if (relativeRange === "LAST_7_DAYS") {
        const startDate = new Date(resolvedDate);
        startDate.setDate(startDate.getDate() - 6);
        return { startDate, endDate: this.endOfDay(resolvedDate), latestEntryDate };
      }

      const startDate = new Date(resolvedDate);
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
      return { startDate, endDate: this.endOfDay(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6)), latestEntryDate };
    }

    if (classification.startDate || classification.endDate) {
      const startDate = classification.startDate
        ? parseEntryDateTime(classification.startDate, "00:00")
        : new Date(todayDate);
      const endDate = classification.endDate
        ? parseEntryDateTime(classification.endDate, "23:59")
        : new Date(startDate);
      endDate.setSeconds(59, 999);
      return { startDate, endDate, latestEntryDate };
    }

    return { startDate: undefined, endDate: undefined, latestEntryDate };
  }

  private inferRelativeRange(message: string): ClassifiedMessage["relativeRange"] | undefined {
    const normalized = message.toLowerCase();
    if (/\btoday\b/.test(normalized)) {
      return "TODAY";
    }
    if (/\byesterday\b/.test(normalized)) {
      return "YESTERDAY";
    }
    if (/\blast\s+7\s+days?\b/.test(normalized)) {
      return "LAST_7_DAYS";
    }
    if (/\bthis\s+week\b/.test(normalized)) {
      return "THIS_WEEK";
    }
    return undefined;
  }

  private getReferenceDate(earliestEntryDate: Date | null, latestEntryDate: Date | undefined, now: Date) {
    if (env.NODE_ENV !== "production" && earliestEntryDate && latestEntryDate && earliestEntryDate.getTime() > now.getTime()) {
      return latestEntryDate;
    }

    return now;
  }

  private endOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private formatDate(value: Date | undefined) {
    if (!value) {
      return "the requested date";
    }

    const date = new Date(value);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  private formatMealType(mealType: MealType) {
    return mealType.charAt(0) + mealType.slice(1).toLowerCase();
  }

  private formatDateTime(value: Date) {
    const date = new Date(value);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  private lastSevenDaysRange() {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }
}
