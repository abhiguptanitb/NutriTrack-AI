import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export class FoodEntryRepository {
  create(userId: string, data: FoodEntryData) {
    return prisma.foodEntry.create({ data: { userId, ...data } });
  }

  findByIdForUser(id: string, userId: string) {
    return prisma.foodEntry.findFirst({ where: { id, userId } });
  }

  update(id: string, data: Partial<FoodEntryData>) {
    return prisma.foodEntry.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.foodEntry.delete({ where: { id } });
  }

  async list(userId: string, where: Prisma.FoodEntryWhereInput, skip: number, take: number) {
    const scopedWhere = { ...where, userId };
    const [items, total] = await Promise.all([
      prisma.foodEntry.findMany({
        where: scopedWhere,
        orderBy: { entryDate: "desc" },
        skip,
        take
      }),
      prisma.foodEntry.count({ where: scopedWhere })
    ]);

    return { items, total };
  }
}

export type FoodEntryData = {
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  foodName: string;
  quantity: number;
  unit?: string;
  entryDate: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  source?: "MANUAL" | "AI_IMAGE" | "AI_ASSISTANT" | "PDF_IMPORT";
};
