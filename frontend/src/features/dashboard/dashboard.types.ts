import type { NutritionGoal } from "@/features/goals/goal.types";
import type { EntrySource, MealType } from "@/features/meals/meal.types";

export type DashboardFoodEntry = {
  id: string;
  foodName: string;
  quantity: string | number;
  unit: string | null;
  mealType: MealType;
  calories: number;
  protein: string | number;
  carbs: string | number;
  fat: string | number;
  fiber: string | number | null;
  source: EntrySource;
  entryDate: string;
};

export type DashboardSummary = {
  date: string;
  goal: NutritionGoal | null;
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  recentMeals: DashboardFoodEntry[];
  mealBreakdown: Array<{
    mealType: MealType;
    calories: number;
  }>;
};
