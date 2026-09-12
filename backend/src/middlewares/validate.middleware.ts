import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema } from "joi";
import { AppError } from "../utils/appError.js";
import { formatJoiValidationError } from "../utils/validationMessages.js";

type ValidationSchemas = {
  body?: ObjectSchema;
  params?: ObjectSchema;
  query?: ObjectSchema;
};

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const [key, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[key as keyof ValidationSchemas], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        return next(new AppError(formatJoiValidationError(error.details), 400));
      }

      Object.assign(req[key as "body" | "params" | "query"], value);
    }

    next();
  };
}
