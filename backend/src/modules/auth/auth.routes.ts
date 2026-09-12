import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { AuthController } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.validator.js";

export const authRoutes = Router();
const controller = new AuthController();

authRoutes.post("/register", validate({ body: registerSchema }), controller.register);
authRoutes.post("/login", validate({ body: loginSchema }), controller.login);
authRoutes.get("/me", requireAuth, controller.me);
