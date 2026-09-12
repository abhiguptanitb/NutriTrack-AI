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
}
