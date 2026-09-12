import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { ChatController } from "./chat.controller.js";
import { chatMessageSchema } from "./chat.validator.js";

export const chatRoutes = Router();
const controller = new ChatController();

chatRoutes.use(requireAuth);
chatRoutes.post("/message", validate({ body: chatMessageSchema }), controller.sendMessage);
