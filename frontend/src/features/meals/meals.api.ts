import { apiRequest } from "@/api/client";
import type { FoodEntry, FoodEntryFilters, FoodEntryPayload, PaginationMeta } from "./meal.types";

export function listFoodEntries(filters: FoodEntryFilters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));

  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }

  if (filters.mealType) {
    params.set("mealType", filters.mealType);
  }

  return apiRequest<{ items: FoodEntry[]; pagination: PaginationMeta }>(`/food-entries?${params.toString()}`);
}

export function getFoodEntry(id: string) {
  return apiRequest<{ foodEntry: FoodEntry }>(`/food-entries/${id}`);
}

export function createFoodEntry(payload: FoodEntryPayload) {
  return apiRequest<{ foodEntry: FoodEntry }>("/food-entries", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateFoodEntry(id: string, payload: FoodEntryPayload) {
  return apiRequest<{ foodEntry: FoodEntry }>(`/food-entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteFoodEntry(id: string) {
  return apiRequest<{ deleted: boolean }>(`/food-entries/${id}`, {
    method: "DELETE"
  });
}
