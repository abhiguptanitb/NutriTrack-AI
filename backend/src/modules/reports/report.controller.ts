import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { ReportService } from "./report.service.js";

const reportService = new ReportService();

export class ReportController {
  weeklyCalories: RequestHandler = async (req, res, next) => {
    try {
      const data = await reportService.weeklyCalories(
        req.user!.id,
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  macroBreakdown: RequestHandler = async (req, res, next) => {
    try {
      const data = await reportService.macroBreakdown(
        req.user!.id,
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  goalComparison: RequestHandler = async (req, res, next) => {
    try {
      const data = await reportService.goalComparison(req.user!.id, new Date(req.query.date as string));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };
}
