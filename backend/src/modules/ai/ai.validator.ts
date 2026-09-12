import Joi from "joi";

export const saveExtractedEntrySchema = Joi.object({
  mealType: Joi.string().valid("BREAKFAST", "LUNCH", "DINNER", "SNACKS").required(),
  foodName: Joi.string().trim().min(1).max(120).required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().trim().max(30).optional(),
  entryDate: Joi.date().iso().required(),
  calories: Joi.number().integer().min(0).required(),
  protein: Joi.number().min(0).required(),
  carbs: Joi.number().min(0).required(),
  fat: Joi.number().min(0).required(),
  fiber: Joi.number().min(0).optional()
});
