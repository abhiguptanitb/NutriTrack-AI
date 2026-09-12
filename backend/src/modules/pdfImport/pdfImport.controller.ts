import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { PdfImportService } from "./pdfImport.service.js";

const pdfImportService = new PdfImportService();

export class PdfImportController {
  preview: RequestHandler = async (req, res, next) => {
    try {
      const data = await pdfImportService.preview(req.file);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  confirm: RequestHandler = async (req, res, next) => {
    try {
      const data = await pdfImportService.confirm(req.user!.id, req.body.entries);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };
}
