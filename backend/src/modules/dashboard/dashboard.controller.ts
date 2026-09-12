import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { DashboardService } from "./dashboard.service.js";

const dashboardService = new DashboardService();

export class DashboardController {
  summary: RequestHandler = async (req, res, next) => {
    try {
      const data = await dashboardService.getSummary(req.user!.id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };
}
