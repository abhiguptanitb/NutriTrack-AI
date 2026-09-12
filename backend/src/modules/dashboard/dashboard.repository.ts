import { prisma } from "../../config/prisma.js";

export class DashboardRepository {
  findActiveGoal(userId: string) {
    return prisma.nutritionGoal.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" }
    });
  }

  getTodayTotals(userId: string, startDate: Date, endDate: Date) {
    return prisma.foodEntry.aggregate({
      where: {
        userId,
        entryDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true
      }
    });
  }

  getTodayMealBreakdown(userId: string, startDate: Date, endDate: Date) {
    return prisma.foodEntry.groupBy({
      by: ["mealType"],
      where: {
        userId,
        entryDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        calories: true
      }
    });
  }

  getRecentMeals(userId: string) {
    return prisma.foodEntry.findMany({
      where: { userId },
      orderBy: { entryDate: "desc" },
      take: 5
    });
  }
}
