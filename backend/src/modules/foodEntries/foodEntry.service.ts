import type { Prisma } from "@prisma/client";
import { AppError } from "../../utils/appError.js";
import { getPagination } from "../../utils/pagination.js";
import { assertEntryDateTimeNotFuture } from "../../utils/entryDateTime.js";
import { FoodEntryRepository } from "./foodEntry.repository.js";

const foodEntryRepository = new FoodEntryRepository();

export class FoodEntryService {
  create(userId: string, data: any) {
    const entryDate = new Date(data.entryDate);
    assertEntryDateTimeNotFuture(entryDate);
    // Manual creation owns the source value; clients cannot label a manual entry as AI/PDF-generated.
    return foodEntryRepository.create(userId, { ...data, entryDate, source: "MANUAL" });
  }

  async getById(userId: string, id: string) {
    const entry = await foodEntryRepository.findByIdForUser(id, userId);
    if (!entry) {
      throw new AppError("Food entry not found", 404);
    }
    return entry;
  }

  async update(userId: string, id: string, data: any) {
    await this.getById(userId, id);
    if (data.entryDate) {
      assertEntryDateTimeNotFuture(new Date(data.entryDate));
    }

    // Source is immutable provenance metadata, so edits can change nutrition fields but not origin.
    const { source: _source, ...editableData } = data;
    return foodEntryRepository.update(id, {
      ...editableData,
      entryDate: data.entryDate ? new Date(data.entryDate) : undefined
    });
  }

  async delete(userId: string, id: string) {
    await this.getById(userId, id);
    await foodEntryRepository.delete(id);
  }

  async list(userId: string, query: any) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.FoodEntryWhereInput = {};

    if (query.mealType) {
      where.mealType = query.mealType;
    }

    if (query.startDate || query.endDate) {
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      where.entryDate = {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: endDate
      };
    }

    const { items, total } = await foodEntryRepository.list(userId, where, skip, take);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
