import { apiRequest } from "@/api/client";
import type { DashboardSummary } from "./dashboard.types";

export function getDashboardSummary() {
  return apiRequest<DashboardSummary>("/dashboard/summary");
}
