import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { GoalController } from "./goal.controller.js";
import { upsertGoalSchema } from "./goal.validator.js";

export const goalRoutes = Router();
const controller = new GoalController();

goalRoutes.use(requireAuth);
goalRoutes.get("/current", controller.getCurrent);
goalRoutes.get("/history", controller.getHistory);
goalRoutes.post("/", validate({ body: upsertGoalSchema }), controller.create);
goalRoutes.put("/current", validate({ body: upsertGoalSchema }), controller.updateCurrent);
