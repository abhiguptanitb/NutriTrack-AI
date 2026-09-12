import Joi from "joi";

const mealType = Joi.string().valid("BREAKFAST", "LUNCH", "DINNER", "SNACKS");
const entrySource = Joi.string().valid("MANUAL", "AI_IMAGE");

export const createFoodEntrySchema = Joi.object({
  mealType: mealType.required(),
  foodName: Joi.string().trim().min(1).max(120).required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().trim().max(30).optional(),
  entryDate: Joi.date().iso().required(),
  calories: Joi.number().integer().min(0).required(),
  protein: Joi.number().min(0).required(),
  carbs: Joi.number().min(0).required(),
  fat: Joi.number().min(0).required(),
  fiber: Joi.number().min(0).optional(),
  source: entrySource.optional()
});

export const updateFoodEntrySchema = createFoodEntrySchema.fork(
  ["mealType", "foodName", "quantity", "entryDate", "calories", "protein", "carbs", "fat"],
  (schema) => schema.optional()
);

export const foodEntryIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const listFoodEntriesSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  mealType: mealType.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});
