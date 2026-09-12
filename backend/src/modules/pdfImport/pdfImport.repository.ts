import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export class PdfImportRepository {
  createMany(userId: string, entries: PdfImportFoodEntryData[]) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.foodEntry.createMany({
        data: entries.map((entry) => ({
          userId,
          ...entry,
          quantity: 1,
          unit: "serving",
          source: "MANUAL"
        }))
      });

      return result.count;
    });
  }
}

export type PdfImportFoodEntryData = Pick<
  Prisma.FoodEntryCreateManyInput,
  "entryDate" | "foodName" | "mealType" | "calories" | "protein" | "carbs" | "fat"
>;
