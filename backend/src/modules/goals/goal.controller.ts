import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { GoalService } from "./goal.service.js";

const goalService = new GoalService();

export class GoalController {
  getCurrent: RequestHandler = async (req, res, next) => {
    try {
      const goal = await goalService.getCurrent(req.user!.id);
      sendSuccess(res, { goal });
    } catch (error) {
      next(error);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const goal = await goalService.create(req.user!.id, req.body);
      sendSuccess(res, { goal }, 201);
    } catch (error) {
      next(error);
    }
  };

  updateCurrent: RequestHandler = async (req, res, next) => {
    try {
      const goal = await goalService.updateCurrent(req.user!.id, req.body);
      sendSuccess(res, { goal });
    } catch (error) {
      next(error);
    }
  };

  getHistory: RequestHandler = async (req, res, next) => {
    try {
      const goals = await goalService.getHistory(req.user!.id);
      sendSuccess(res, { goals });
    } catch (error) {
      next(error);
    }
  };
}
