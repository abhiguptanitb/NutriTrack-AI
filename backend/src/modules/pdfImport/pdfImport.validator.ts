import Joi from "joi";

export const pdfImportEntrySchema = Joi.object({
  entryDate: Joi.date().iso().required(),
  foodName: Joi.string().trim().min(1).max(120).required(),
  mealType: Joi.string().valid("BREAKFAST", "LUNCH", "DINNER", "SNACKS").required(),
  calories: Joi.number().integer().min(0).required(),
  protein: Joi.number().min(0).required(),
  carbs: Joi.number().min(0).required(),
  fat: Joi.number().min(0).required()
});

export const confirmPdfImportSchema = Joi.object({
  entries: Joi.array().items(pdfImportEntrySchema).min(1).max(200).required()
});
