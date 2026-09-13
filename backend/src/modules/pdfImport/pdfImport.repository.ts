import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export class PdfImportRepository {
  createMany(userId: string, entries: PdfImportFoodEntryData[]) {
    return prisma.$transaction(async (tx) => {
      const data = entries.map((entry) => ({
        userId,
        entryDate: entry.entryDate,
        foodName: entry.foodName,
        mealType: entry.mealType,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        quantity: 1,
        unit: "serving",
        source: "PDF_IMPORT" as const
      }));
      console.debug("PDF import final database payload:", data);

      const result = await tx.foodEntry.createMany({
        data
      });

      return result.count;
    });
  }
}

export type PdfImportFoodEntryData = Pick<
  Prisma.FoodEntryCreateManyInput,
  "entryDate" | "foodName" | "mealType" | "calories" | "protein" | "carbs" | "fat"
>;
