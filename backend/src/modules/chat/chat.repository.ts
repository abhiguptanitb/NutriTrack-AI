import { prisma } from "../../config/prisma.js";
import { FoodEntryRepository } from "../foodEntries/foodEntry.repository.js";
import { GoalRepository } from "../goals/goal.repository.js";

const foodEntryRepository = new FoodEntryRepository();
const goalRepository = new GoalRepository();

export class ChatRepository {
  createFoodEntry(userId: string, data: Parameters<FoodEntryRepository["create"]>[1]) {
    return foodEntryRepository.create(userId, data);
  }

  getCurrentGoal(userId: string) {
    return goalRepository.findActiveByUserId(userId);
  }

  listFoodEntries(userId: string, filters: {
    startDate?: Date;
    endDate?: Date;
    mealType?: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  }) {
    return prisma.foodEntry.findMany({
      where: {
        userId,
        mealType: filters.mealType,
        entryDate: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      },
      orderBy: { entryDate: "desc" },
      take: 100
    });
  }

  foodEntryDateBounds(userId: string) {
    return prisma.foodEntry.aggregate({
      where: { userId },
      _min: { entryDate: true },
      _max: { entryDate: true }
    });
  }
}
