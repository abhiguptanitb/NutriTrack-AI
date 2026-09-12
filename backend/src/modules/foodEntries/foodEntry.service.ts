import type { Prisma } from "@prisma/client";
import { AppError } from "../../utils/appError.js";
import { getPagination } from "../../utils/pagination.js";
import { FoodEntryRepository } from "./foodEntry.repository.js";

const foodEntryRepository = new FoodEntryRepository();

export class FoodEntryService {
  create(userId: string, data: any) {
    return foodEntryRepository.create(userId, { ...data, entryDate: new Date(data.entryDate) });
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
    return foodEntryRepository.update(id, {
      ...data,
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
