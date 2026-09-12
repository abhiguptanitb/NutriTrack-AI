import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { DashboardController } from "./dashboard.controller.js";

export const dashboardRoutes = Router();
const controller = new DashboardController();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get("/summary", controller.summary);
