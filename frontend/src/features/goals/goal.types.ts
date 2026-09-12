export type NutritionGoal = {
  id: string;
  userId: string;
  dailyCalories: number;
  proteinGrams: string | number;
  carbGrams: string | number;
  fatGrams: string | number;
  weightGoalKg: string | number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GoalFormValues = {
  dailyCalories: string;
  proteinGrams: string;
  carbGrams: string;
  fatGrams: string;
  weightGoalKg: string;
};

export type GoalPayload = {
  dailyCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  weightGoalKg?: number;
};
