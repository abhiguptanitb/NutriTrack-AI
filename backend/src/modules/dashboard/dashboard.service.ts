import { DashboardRepository } from "./dashboard.repository.js";

const dashboardRepository = new DashboardRepository();

const mealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const;

export class DashboardService {
  async getSummary(userId: string) {
    const { startDate, endDate } = this.todayRange();
    const [goal, totals, mealBreakdownRows, recentMeals] = await Promise.all([
      dashboardRepository.findActiveGoal(userId),
      dashboardRepository.getTodayTotals(userId, startDate, endDate),
      dashboardRepository.getTodayMealBreakdown(userId, startDate, endDate),
      dashboardRepository.getRecentMeals(userId)
    ]);

    const consumed = {
      calories: Number(totals._sum.calories ?? 0),
      protein: Number(totals._sum.protein ?? 0),
      carbs: Number(totals._sum.carbs ?? 0),
      fat: Number(totals._sum.fat ?? 0)
    };

    const targets = {
      calories: goal?.dailyCalories ?? 0,
      protein: Number(goal?.proteinGrams ?? 0),
      carbs: Number(goal?.carbGrams ?? 0),
      fat: Number(goal?.fatGrams ?? 0)
    };

    const mealBreakdown = mealTypes.map((mealType) => {
      const row = mealBreakdownRows.find((item) => item.mealType === mealType);
      return {
        mealType,
        calories: Number(row?._sum.calories ?? 0)
      };
    });

    return {
      date: startDate.toISOString().slice(0, 10),
      goal,
      consumed,
      targets,
      progress: {
        calories: this.percent(consumed.calories, targets.calories),
        protein: this.percent(consumed.protein, targets.protein),
        carbs: this.percent(consumed.carbs, targets.carbs),
        fat: this.percent(consumed.fat, targets.fat)
      },
      recentMeals,
      mealBreakdown
    };
  }

  private todayRange() {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  private percent(actual: number, target: number) {
    if (!target) {
      return 0;
    }

    return Math.round((actual / target) * 100);
  }
}
