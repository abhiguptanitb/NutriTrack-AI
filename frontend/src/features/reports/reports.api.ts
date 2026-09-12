import { apiRequest } from "@/api/client";
import type { GoalComparisonPoint, MacroBreakdownPoint, WeeklyCaloriePoint } from "./report.types";

export function getWeeklyCalories(startDate: string, endDate: string) {
  return apiRequest<WeeklyCaloriePoint[]>(`/reports/weekly-calories?startDate=${startDate}&endDate=${endDate}`);
}

export function getMacroBreakdown(startDate: string, endDate: string) {
  return apiRequest<MacroBreakdownPoint[]>(`/reports/macro-breakdown?startDate=${startDate}&endDate=${endDate}`);
}

export function getGoalComparison(date: string) {
  return apiRequest<GoalComparisonPoint[]>(`/reports/goal-comparison?date=${date}`);
}
