import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "node:fs/promises";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import { assertEntryDateTimeNotFuture } from "../../utils/entryDateTime.js";
import { FoodEntryRepository } from "../foodEntries/foodEntry.repository.js";
import { AiRepository } from "./ai.repository.js";

const aiRepository = new AiRepository();
const foodEntryRepository = new FoodEntryRepository();

type ExtractedNutrition = {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const nutritionPrompt = `
You are a nutrition estimation assistant. Analyze the food image and return ONLY valid JSON.
Do not include markdown, code fences, prose, comments, or extra keys.
Use this exact shape:
{
  "foodName": "",
  "quantity": "",
  "unit": "",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0
}
If a value is uncertain, provide your best estimate. Use grams for macro nutrients.
`;

export class AiService {
  async extractNutrition(userId: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new AppError("Image file is required", 400);
    }

    if (!env.GEMINI_API_KEY) {
      throw new AppError("Gemini API key is not configured", 500);
    }

    const extraction = await aiRepository.createPending(userId, file.path);

    try {
      const imageBuffer = await fs.readFile(file.path);
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

      const result = await model.generateContent([
        nutritionPrompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: file.mimetype
          }
        }
      ]);

      const text = result.response.text();
      const parsed = this.parseGeminiJson(text);
      const nutrition = this.normalizeNutrition(parsed);
      const saved = await aiRepository.markSuccess(extraction.id, { text }, nutrition);

      return { extraction: saved, nutrition };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error(`AI nutrition extraction failed using ${env.GEMINI_MODEL}: ${errorMessage}`);
      await aiRepository.markFailed(extraction.id, errorMessage);
      throw new AppError(`Unable to extract nutrition from image: ${errorMessage}`, 502);
    }
  }

  saveExtractedEntry(userId: string, data: SaveExtractedEntryInput) {
    const entryDate = new Date(data.entryDate);
    assertEntryDateTimeNotFuture(entryDate);
    return foodEntryRepository.create(userId, {
      ...data,
      entryDate,
      source: "AI_IMAGE"
    });
  }

  private parseGeminiJson(text: string): unknown {
    const withoutFences = text.replace(/```json|```/gi, "").trim();
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Gemini response did not include a JSON object");
    }

    return JSON.parse(withoutFences.slice(start, end + 1));
  }

  private normalizeNutrition(value: unknown): ExtractedNutrition {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Gemini response JSON must be an object");
    }

    const record = value as Record<string, unknown>;

    return {
      foodName: this.cleanText(record.foodName, "Unknown food"),
      quantity: this.cleanNumber(record.quantity),
      unit: this.cleanText(record.unit, "serving"),
      calories: Math.round(this.cleanNumber(record.calories)),
      protein: this.cleanNumber(record.protein),
      carbs: this.cleanNumber(record.carbs),
      fat: this.cleanNumber(record.fat),
      fiber: this.cleanNumber(record.fiber)
    };
  }

  private cleanText(value: unknown, fallback: string) {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 120) : fallback;
  }

  private cleanNumber(value: unknown) {
    const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return 0;
    }

    return Number(numericValue.toFixed(2));
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "AI extraction failed";
  }
}

type SaveExtractedEntryInput = {
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  foodName: string;
  quantity: number;
  unit?: string;
  entryDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};
