import { AppError } from "../../utils/appError.js";
import { GoalRepository } from "./goal.repository.js";

const goalRepository = new GoalRepository();

export class GoalService {
  getCurrent(userId: string) {
    return goalRepository.findActiveByUserId(userId);
  }

  create(userId: string, data: Parameters<GoalRepository["createActive"]>[1]) {
    return goalRepository.createActive(userId, data);
  }

  async updateCurrent(userId: string, data: Parameters<GoalRepository["update"]>[1]) {
    const currentGoal = await goalRepository.findActiveByUserId(userId);
    if (!currentGoal) {
      throw new AppError("Active goal not found", 404);
    }

    return goalRepository.update(currentGoal.id, data);
  }

  getHistory(userId: string) {
    return goalRepository.listByUserId(userId);
  }
}
