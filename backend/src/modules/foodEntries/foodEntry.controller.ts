import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { FoodEntryService } from "./foodEntry.service.js";

const foodEntryService = new FoodEntryService();

export class FoodEntryController {
  create: RequestHandler = async (req, res, next) => {
    try {
      const foodEntry = await foodEntryService.create(req.user!.id, req.body);
      sendSuccess(res, { foodEntry }, 201);
    } catch (error) {
      next(error);
    }
  };

  list: RequestHandler = async (req, res, next) => {
    try {
      const data = await foodEntryService.list(req.user!.id, req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  getById: RequestHandler = async (req, res, next) => {
    try {
      const foodEntry = await foodEntryService.getById(req.user!.id, String(req.params.id));
      sendSuccess(res, { foodEntry });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const foodEntry = await foodEntryService.update(req.user!.id, String(req.params.id), req.body);
      sendSuccess(res, { foodEntry });
    } catch (error) {
      next(error);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      await foodEntryService.delete(req.user!.id, String(req.params.id));
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };
}
