import Joi from "joi";

export const upsertGoalSchema = Joi.object({
  dailyCalories: Joi.number().integer().positive().required(),
  proteinGrams: Joi.number().min(0).required(),
  carbGrams: Joi.number().min(0).required(),
  fatGrams: Joi.number().min(0).required(),
  weightGoalKg: Joi.number().positive().optional()
});
