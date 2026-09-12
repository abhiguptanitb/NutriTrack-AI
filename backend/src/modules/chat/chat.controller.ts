import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { ChatService } from "./chat.service.js";

const chatService = new ChatService();

export class ChatController {
  sendMessage: RequestHandler = async (req, res, next) => {
    try {
      const data = await chatService.handleMessage(req.user!.id, req.body.message);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };
}
