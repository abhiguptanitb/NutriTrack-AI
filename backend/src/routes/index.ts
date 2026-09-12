import { Router } from "express";
import { aiRoutes } from "../modules/ai/ai.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { chatRoutes } from "../modules/chat/chat.routes.js";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes.js";
import { foodEntryRoutes } from "../modules/foodEntries/foodEntry.routes.js";
import { goalRoutes } from "../modules/goals/goal.routes.js";
import { pdfImportRoutes } from "../modules/pdfImport/pdfImport.routes.js";
import { reportRoutes } from "../modules/reports/report.routes.js";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/dashboard", dashboardRoutes);
apiRoutes.use("/goals", goalRoutes);
apiRoutes.use("/food-entries", foodEntryRoutes);
apiRoutes.use("/reports", reportRoutes);
apiRoutes.use("/ai", aiRoutes);
apiRoutes.use("/chat", chatRoutes);
apiRoutes.use("/pdf-import", pdfImportRoutes);
