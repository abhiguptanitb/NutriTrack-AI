import multer from "multer";
import type { RequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import { AppError } from "../utils/appError.js";

const uploadDir = path.resolve("uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are supported"));
      return;
    }

    cb(null, true);
  }
});

export const handleImageUpload: RequestHandler = (req, res, next) => {
  imageUpload.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Image must be 5 MB or smaller", 400));
      return;
    }

    next(new AppError(error instanceof Error ? error.message : "Invalid image upload", 400));
  });
};

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      cb(new Error("Only PDF uploads are supported"));
      return;
    }

    cb(null, true);
  }
});

export const handlePdfUpload: RequestHandler = (req, res, next) => {
  pdfUpload.single("pdf")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("PDF must be 10 MB or smaller", 400));
      return;
    }

    next(new AppError(error instanceof Error ? error.message : "Invalid PDF upload", 400));
  });
};
