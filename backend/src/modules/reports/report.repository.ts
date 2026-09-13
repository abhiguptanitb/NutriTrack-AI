import { prisma } from "../../config/prisma.js";

type WeeklyCalorieRow = {
  day: Date;
  calories: bigint | number | null;
};

export class ReportRepository {
  weeklyCalorieTrend(userId: string, startDate: Date, endDate: Date) {
    return prisma.$queryRaw<WeeklyCalorieRow[]>`
      SELECT DATE_TRUNC('day', "entryDate") AS day, COALESCE(SUM("calories"), 0) AS calories
      FROM "FoodEntry"
      WHERE "userId" = ${userId}
        AND "entryDate" >= ${startDate}
        AND "entryDate" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "entryDate")
      ORDER BY day ASC
    `;
  }

  macroTotals(userId: string, startDate: Date, endDate: Date) {
    return prisma.foodEntry.aggregate({
      where: {
        userId,
        entryDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        protein: true,
        carbs: true,
        fat: true
      }
    });
  }

  nutritionTotals(userId: string, startDate: Date, endDate: Date) {
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
      },
      _count: {
        _all: true
      }
    });
  }

  findActiveGoal(userId: string) {
    return prisma.nutritionGoal.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" }
    });
  }
}
