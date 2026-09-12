import type { MealType } from "@/features/meals/meal.types";

export type PdfImportEntry = {
  entryDate: string;
  foodName: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PdfImportPreviewResponse = {
  entries: PdfImportEntry[];
};

export type PdfImportConfirmResponse = {
  count: number;
};
