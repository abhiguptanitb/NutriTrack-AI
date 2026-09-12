import type { RequestHandler } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

export class AuthController {
  register: RequestHandler = async (req, res, next) => {
    try {
      const data = await authService.register(req.body);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  login: RequestHandler = async (req, res, next) => {
    try {
      const data = await authService.login(req.body);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  me: RequestHandler = (req, res) => {
    sendSuccess(res, { user: req.user });
  };
}
