import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { handleImageUpload } from "../../middlewares/upload.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { AiController } from "./ai.controller.js";
import { saveExtractedEntrySchema } from "./ai.validator.js";

export const aiRoutes = Router();
const controller = new AiController();

aiRoutes.use(requireAuth);
aiRoutes.post("/extract-nutrition", handleImageUpload, controller.extractNutrition);
aiRoutes.post("/save-entry", validate({ body: saveExtractedEntrySchema }), controller.saveExtractedEntry);
