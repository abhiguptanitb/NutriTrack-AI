import { apiRequest } from "@/api/client";
import type { PdfImportConfirmResponse, PdfImportEntry, PdfImportPreviewResponse } from "./pdfImport.types";

export function previewPdfImport(pdf: File) {
  const formData = new FormData();
  formData.append("pdf", pdf);

  return apiRequest<PdfImportPreviewResponse>("/pdf-import/preview", {
    method: "POST",
    body: formData
  });
}

export function confirmPdfImport(entries: PdfImportEntry[]) {
  return apiRequest<PdfImportConfirmResponse>("/pdf-import/confirm", {
    method: "POST",
    body: JSON.stringify({ entries })
  });
}
