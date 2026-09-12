import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password@123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@nutritrack.ai" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@nutritrack.ai",
      passwordHash
    }
  });

  await prisma.nutritionGoal.updateMany({
    where: { userId: user.id },
    data: { isActive: false }
  });

  await prisma.nutritionGoal.create({
    data: {
      userId: user.id,
      dailyCalories: 2200,
      proteinGrams: 140,
      carbGrams: 250,
      fatGrams: 70,
      weightGoalKg: 72,
      isActive: true
    }
  });

  await prisma.foodEntry.deleteMany({
    where: { userId: user.id }
  });

  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const lunch = new Date(today);
  lunch.setHours(13, 30, 0, 0);

  const dinner = new Date(today);
  dinner.setHours(20, 0, 0, 0);

  await prisma.foodEntry.createMany({
    data: [
      {
        userId: user.id,
        mealType: "BREAKFAST",
        foodName: "Greek yogurt with berries",
        quantity: 1,
        unit: "bowl",
        entryDate: today,
        calories: 320,
        protein: 24,
        carbs: 42,
        fat: 7,
        fiber: 5,
        source: "MANUAL"
      },
      {
        userId: user.id,
        mealType: "LUNCH",
        foodName: "Grilled chicken rice bowl",
        quantity: 1,
        unit: "serving",
        entryDate: lunch,
        calories: 640,
        protein: 48,
        carbs: 68,
        fat: 18,
        fiber: 8,
        source: "MANUAL"
      },
      {
        userId: user.id,
        mealType: "DINNER",
        foodName: "Paneer salad wrap",
        quantity: 1,
        unit: "wrap",
        entryDate: dinner,
        calories: 520,
        protein: 28,
        carbs: 46,
        fat: 24,
        fiber: 6,
        source: "AI_IMAGE"
      }
    ]
  });

  console.log("Seed completed");
  console.log("Demo login: demo@nutritrack.ai / Password@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
