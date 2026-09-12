export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
export type EntrySource = "MANUAL" | "AI_IMAGE";

export type FoodEntry = {
  id: string;
  userId: string;
  foodName: string;
  quantity: string | number;
  unit: string | null;
  mealType: MealType;
  calories: number;
  protein: string | number;
  carbs: string | number;
  fat: string | number;
  fiber: string | number | null;
  entryDate: string;
  source: EntrySource;
  createdAt: string;
  updatedAt: string;
};

export type FoodEntryFormValues = {
  foodName: string;
  quantity: string;
  unit: string;
  mealType: MealType;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  entryDate: string;
  source: EntrySource;
};

export type FoodEntryPayload = {
  foodName: string;
  quantity: number;
  unit?: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  entryDate: string;
  source?: EntrySource;
};

export type FoodEntryFilters = {
  startDate?: string;
  endDate?: string;
  mealType?: MealType | "";
  page: number;
  limit: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
