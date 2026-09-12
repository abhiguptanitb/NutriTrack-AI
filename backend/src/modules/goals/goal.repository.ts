import { prisma } from "../../config/prisma.js";

export class GoalRepository {
  findActiveByUserId(userId: string) {
    return prisma.nutritionGoal.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async createActive(userId: string, data: GoalData) {
    return prisma.$transaction(async (tx) => {
      await tx.nutritionGoal.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      });

      return tx.nutritionGoal.create({ data: { userId, ...data, isActive: true } });
    });
  }

  update(id: string, data: GoalData) {
    return prisma.nutritionGoal.update({ where: { id }, data });
  }

  listByUserId(userId: string) {
    return prisma.nutritionGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }
}

export type GoalData = {
  dailyCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  weightGoalKg?: number;
};
