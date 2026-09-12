import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { handlePdfUpload } from "../../middlewares/upload.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { PdfImportController } from "./pdfImport.controller.js";
import { confirmPdfImportSchema } from "./pdfImport.validator.js";

export const pdfImportRoutes = Router();
const controller = new PdfImportController();

pdfImportRoutes.use(requireAuth);
pdfImportRoutes.post("/preview", handlePdfUpload, controller.preview);
pdfImportRoutes.post("/confirm", validate({ body: confirmPdfImportSchema }), controller.confirm);
