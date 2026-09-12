import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { FoodEntryController } from "./foodEntry.controller.js";
import {
  createFoodEntrySchema,
  foodEntryIdSchema,
  listFoodEntriesSchema,
  updateFoodEntrySchema
} from "./foodEntry.validator.js";

export const foodEntryRoutes = Router();
const controller = new FoodEntryController();

foodEntryRoutes.use(requireAuth);
foodEntryRoutes.post("/", validate({ body: createFoodEntrySchema }), controller.create);
foodEntryRoutes.get("/", validate({ query: listFoodEntriesSchema }), controller.list);
foodEntryRoutes.get("/:id", validate({ params: foodEntryIdSchema }), controller.getById);
foodEntryRoutes.put(
  "/:id",
  validate({ params: foodEntryIdSchema, body: updateFoodEntrySchema }),
  controller.update
);
foodEntryRoutes.delete("/:id", validate({ params: foodEntryIdSchema }), controller.delete);
