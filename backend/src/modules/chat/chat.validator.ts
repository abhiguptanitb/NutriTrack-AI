import Joi from "joi";

export const chatMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required()
});
