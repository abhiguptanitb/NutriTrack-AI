import { ReportRepository } from "./report.repository.js";

const reportRepository = new ReportRepository();

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class ReportService {
  async weeklyCalorieSummary(userId: string, startDate: Date, endDate: Date) {
    const [trend, totals] = await Promise.all([
      this.weeklyCalories(userId, startDate, endDate),
      reportRepository.nutritionTotals(userId, startDate, this.endOfDay(endDate))
    ]);
    const totalCalories = trend.reduce((sum, day) => sum + day.calories, 0);
    const reportingDays = this.daysBetween(startDate, endDate).length;

    return {
      trend,
      totalCalories,
      averageCalories: reportingDays ? Math.round(totalCalories / reportingDays) : 0,
      reportingDays,
      totalProtein: Number(totals._sum.protein ?? 0),
      totalCarbs: Number(totals._sum.carbs ?? 0),
      totalFat: Number(totals._sum.fat ?? 0),
      mealCount: totals._count._all
    };
  }

  async weeklyCalories(userId: string, startDate: Date, endDate: Date) {
    const rows = await reportRepository.weeklyCalorieTrend(userId, startDate, this.endOfDay(endDate));
    const caloriesByDate = new Map(
      rows.map((row) => [row.day.toISOString().slice(0, 10), Number(row.calories ?? 0)])
    );

    return this.daysBetween(startDate, endDate).map((date) => ({
      date: date.toISOString().slice(0, 10),
      day: dayLabels[date.getDay()],
      calories: caloriesByDate.get(date.toISOString().slice(0, 10)) ?? 0
    }));
  }

  async macroBreakdown(userId: string, startDate: Date, endDate: Date) {
    const totals = await reportRepository.macroTotals(userId, startDate, this.endOfDay(endDate));

    return [
      { name: "Protein", key: "protein", value: Number(totals._sum.protein ?? 0) },
      { name: "Carbs", key: "carbs", value: Number(totals._sum.carbs ?? 0) },
      { name: "Fat", key: "fat", value: Number(totals._sum.fat ?? 0) }
    ];
  }

  async goalComparison(userId: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [totals, goal] = await Promise.all([
      reportRepository.nutritionTotals(userId, start, end),
      reportRepository.findActiveGoal(userId)
    ]);

    const actual = {
      calories: Number(totals._sum.calories ?? 0),
      protein: Number(totals._sum.protein ?? 0),
      carbs: Number(totals._sum.carbs ?? 0),
      fat: Number(totals._sum.fat ?? 0)
    };

    const goalValues = {
      calories: goal?.dailyCalories ?? 0,
      protein: Number(goal?.proteinGrams ?? 0),
      carbs: Number(goal?.carbGrams ?? 0),
      fat: Number(goal?.fatGrams ?? 0)
    };

    return [
      { name: "Calories", goal: goalValues.calories, actual: actual.calories },
      { name: "Protein", goal: goalValues.protein, actual: actual.protein },
      { name: "Carbs", goal: goalValues.carbs, actual: actual.carbs },
      { name: "Fat", goal: goalValues.fat, actual: actual.fat }
    ];
  }

  private endOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private daysBetween(startDate: Date, endDate: Date) {
    const dates: Date[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }
}
