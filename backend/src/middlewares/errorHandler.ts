import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/appError.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : "Internal server error";

  if (!(error instanceof AppError)) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};
