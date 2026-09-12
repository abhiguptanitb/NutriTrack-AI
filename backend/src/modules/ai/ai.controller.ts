import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AiService } from "./ai.service.js";

const aiService = new AiService();

export class AiController {
  extractNutrition: RequestHandler = async (req, res, next) => {
    try {
      const data = await aiService.extractNutrition(req.user!.id, req.file);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  saveExtractedEntry: RequestHandler = async (req, res, next) => {
    try {
      const foodEntry = await aiService.saveExtractedEntry(req.user!.id, req.body);
      sendSuccess(res, { foodEntry }, 201);
    } catch (error) {
      next(error);
    }
  };
}
