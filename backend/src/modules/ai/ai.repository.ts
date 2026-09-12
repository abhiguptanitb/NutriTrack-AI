import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export class AiRepository {
  createPending(userId: string, imagePath: string) {
    return prisma.aiExtraction.create({ data: { userId, imagePath, status: "PENDING" } });
  }

  markSuccess(id: string, rawGeminiResponse: Prisma.InputJsonValue, parsedNutritionJson: Prisma.InputJsonValue) {
    return prisma.aiExtraction.update({
      where: { id },
      data: { status: "SUCCESS", rawGeminiResponse, parsedNutritionJson }
    });
  }

  markFailed(id: string, errorMessage: string) {
    return prisma.aiExtraction.update({
      where: { id },
      data: { status: "FAILED", errorMessage }
    });
  }
}
