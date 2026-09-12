import type { FoodEntry, MealType } from "@/features/meals/meal.types";

export type ExtractedNutrition = {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type AiExtraction = {
  id: string;
  userId: string;
  imagePath: string;
  rawGeminiResponse: unknown | null;
  parsedNutritionJson: unknown | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  errorMessage: string | null;
  createdAt: string;
};

export type AiExtractionResponse = {
  extraction: AiExtraction;
  nutrition: ExtractedNutrition;
};

export type AiSaveEntryPayload = ExtractedNutrition & {
  mealType: MealType;
  entryDate: string;
};

export type AiSaveEntryResponse = {
  foodEntry: FoodEntry;
};
