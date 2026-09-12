import { apiRequest } from "@/api/client";
import type { GoalPayload, NutritionGoal } from "./goal.types";

export function getActiveGoal() {
  return apiRequest<{ goal: NutritionGoal | null }>("/goals/current");
}

export function createGoal(payload: GoalPayload) {
  return apiRequest<{ goal: NutritionGoal }>("/goals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCurrentGoal(payload: GoalPayload) {
  return apiRequest<{ goal: NutritionGoal }>("/goals/current", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function getGoalHistory() {
  return apiRequest<{ goals: NutritionGoal[] }>("/goals/history");
}
