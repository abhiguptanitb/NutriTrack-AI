import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ReportController } from "./report.controller.js";
import { dateRangeSchema, goalComparisonSchema } from "./report.validator.js";

export const reportRoutes = Router();
const controller = new ReportController();

reportRoutes.use(requireAuth);
reportRoutes.get("/weekly-calories", validate({ query: dateRangeSchema }), controller.weeklyCalories);
reportRoutes.get("/macro-breakdown", validate({ query: dateRangeSchema }), controller.macroBreakdown);
reportRoutes.get("/goal-comparison", validate({ query: goalComparisonSchema }), controller.goalComparison);
