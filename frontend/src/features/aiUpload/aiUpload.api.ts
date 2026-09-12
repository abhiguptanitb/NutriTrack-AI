import { apiRequest } from "@/api/client";
import type { AiExtractionResponse, AiSaveEntryPayload, AiSaveEntryResponse } from "./aiUpload.types";

export function extractNutrition(image: File) {
  const formData = new FormData();
  formData.append("image", image);

  return apiRequest<AiExtractionResponse>("/ai/extract-nutrition", {
    method: "POST",
    body: formData
  });
}

export function saveAiFoodEntry(payload: AiSaveEntryPayload) {
  return apiRequest<AiSaveEntryResponse>("/ai/save-entry", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
