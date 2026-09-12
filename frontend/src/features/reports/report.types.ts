export type WeeklyCaloriePoint = {
  date: string;
  day: string;
  calories: number;
};

export type MacroBreakdownPoint = {
  name: string;
  key: "protein" | "carbs" | "fat";
  value: number;
};

export type GoalComparisonPoint = {
  name: string;
  goal: number;
  actual: number;
};
