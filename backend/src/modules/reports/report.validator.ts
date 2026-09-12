import Joi from "joi";

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required()
});

export const goalComparisonSchema = Joi.object({
  date: Joi.date().iso().required()
});
