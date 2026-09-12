import swaggerJSDoc from "swagger-jsdoc";

const successSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: { type: "object", additionalProperties: true }
  },
  required: ["success", "data"]
};

const errorSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    message: { type: "string", example: "Validation failed" }
  },
  required: ["success", "message"]
};

const commonErrors = {
  "400": { $ref: "#/components/responses/BadRequest" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "404": { $ref: "#/components/responses/NotFound" },
  "500": { $ref: "#/components/responses/InternalServerError" }
};

const protectedOperation = { security: [{ bearerAuth: [] }] };
const jsonSuccess = { content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } };

const mealTypeParameter = {
  name: "mealType",
  in: "query",
  required: false,
  schema: { type: "string", enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] }
};

const openApiDefinition = {
  openapi: "3.0.3",
  info: {
    title: "NutriTrack AI API",
    version: "0.1.0",
    description: "API for nutrition tracking, goals, reports, Gemini nutrition extraction, chat assistance, and PDF diary import."
  },
  servers: [{ url: "http://localhost:5000/api", description: "Local development" }],
  tags: [
    { name: "Auth" },
    { name: "Goals" },
    { name: "Food Entries" },
    { name: "Reports" },
    { name: "Dashboard" },
    { name: "AI" },
    { name: "Chat" },
    { name: "PDF Import" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the JWT returned by /auth/register or /auth/login."
      }
    },
    schemas: {
      ApiSuccess: successSchema,
      ApiError: errorSchema,
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Alex Morgan" },
          email: { type: "string", format: "email", example: "alex@example.com" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      NutritionGoal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          dailyCalories: { type: "integer", example: 2200 },
          proteinGrams: { type: "number", example: 140 },
          carbGrams: { type: "number", example: 250 },
          fatGrams: { type: "number", example: 70 },
          weightGoalKg: { type: "number", nullable: true, example: 72 },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      FoodEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          mealType: { type: "string", enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] },
          foodName: { type: "string", example: "Grilled chicken rice bowl" },
          quantity: { type: "number", example: 1 },
          unit: { type: "string", nullable: true, example: "serving" },
          entryDate: { type: "string", format: "date-time" },
          calories: { type: "integer", example: 640 },
          protein: { type: "number", example: 48 },
          carbs: { type: "number", example: 68 },
          fat: { type: "number", example: 18 },
          fiber: { type: "number", nullable: true, example: 8 },
          source: { type: "string", enum: ["MANUAL", "AI_IMAGE"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      AiExtraction: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          imagePath: { type: "string" },
          rawGeminiResponse: { type: "object", nullable: true, additionalProperties: true },
          parsedNutritionJson: { type: "object", nullable: true, additionalProperties: true },
          status: { type: "string", enum: ["PENDING", "SUCCESS", "FAILED"] },
          errorMessage: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      ChatRequest: {
        type: "object",
        required: ["message"],
        properties: { message: { type: "string", minLength: 1, maxLength: 1000, example: "What have I eaten today?" } }
      },
      ChatResponse: {
        type: "object",
        properties: {
          intent: { type: "string", enum: ["CREATE_FOOD_ENTRY", "GET_CURRENT_GOAL", "GET_TODAY_PROGRESS", "GET_WEEKLY_REPORT", "NUTRITION_QUESTION", "UNKNOWN"] },
          reply: { type: "string" },
          data: { type: "object", nullable: true, additionalProperties: true }
        }
      },
      PdfImportEntry: {
        type: "object",
        required: ["entryDate", "foodName", "mealType", "calories", "protein", "carbs", "fat"],
        properties: {
          entryDate: { type: "string", format: "date", example: "2026-09-12" },
          foodName: { type: "string", example: "Greek yogurt with berries" },
          mealType: { type: "string", enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] },
          calories: { type: "integer", minimum: 0 },
          protein: { type: "number", minimum: 0 },
          carbs: { type: "number", minimum: 0 },
          fat: { type: "number", minimum: 0 }
        }
      },
      PdfImportPreview: {
        type: "object",
        required: ["entries"],
        properties: { entries: { type: "array", items: { $ref: "#/components/schemas/PdfImportEntry" } } }
      },
      PdfImportConfirm: {
        type: "object",
        required: ["entries"],
        properties: { entries: { type: "array", minItems: 1, maxItems: 200, items: { $ref: "#/components/schemas/PdfImportEntry" } } }
      },
      NutritionInput: {
        type: "object",
        required: ["mealType", "foodName", "quantity", "entryDate", "calories", "protein", "carbs", "fat"],
        properties: {
          mealType: { type: "string", enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] },
          foodName: { type: "string", example: "Avocado toast" },
          quantity: { type: "number", exclusiveMinimum: true },
          unit: { type: "string", maxLength: 30 },
          entryDate: { type: "string", format: "date-time" },
          calories: { type: "integer", minimum: 0 },
          protein: { type: "number", minimum: 0 },
          carbs: { type: "number", minimum: 0 },
          fat: { type: "number", minimum: 0 },
          fiber: { type: "number", minimum: 0 }
        }
      }
    },
    responses: {
      BadRequest: { description: "Invalid request or validation failure", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      Unauthorized: { description: "Missing or invalid JWT", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      NotFound: { description: "Requested resource was not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      InternalServerError: { description: "Unexpected server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
    },
    parameters: {
      EntryId: { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      StartDate: { name: "startDate", in: "query", required: false, schema: { type: "string", format: "date" } },
      EndDate: { name: "endDate", in: "query", required: false, schema: { type: "string", format: "date" } },
      StartDateRequired: { name: "startDate", in: "query", required: true, schema: { type: "string", format: "date" } },
      EndDateRequired: { name: "endDate", in: "query", required: true, schema: { type: "string", format: "date" } },
      DateRequired: { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } },
      MealType: mealTypeParameter,
      Page: { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
      Limit: { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } }
    }
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"], summary: "Register a user",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string", minLength: 2, maxLength: 80 }, email: { type: "string", format: "email" }, password: { type: "string", format: "password", minLength: 8 } } } } } },
        responses: { "201": { description: "User registered", ...jsonSuccess }, ...commonErrors }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"], summary: "Log in",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string", format: "password" } } } } } },
        responses: { "200": { description: "Authenticated", ...jsonSuccess }, ...commonErrors }
      }
    },
    "/auth/me": {
      get: { tags: ["Auth"], summary: "Get current user", ...protectedOperation, responses: { "200": { description: "Current user", ...jsonSuccess }, ...commonErrors } }
    },
    "/goals": {
      post: { tags: ["Goals"], summary: "Create an active goal", ...protectedOperation, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NutritionGoal" } } } }, responses: { "201": { description: "Goal created", ...jsonSuccess }, ...commonErrors } }
    },
    "/goals/current": {
      get: { tags: ["Goals"], summary: "Get the active goal", ...protectedOperation, responses: { "200": { description: "Active goal", ...jsonSuccess }, ...commonErrors } },
      put: { tags: ["Goals"], summary: "Update the active goal", ...protectedOperation, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NutritionGoal" } } } }, responses: { "200": { description: "Goal updated", ...jsonSuccess }, ...commonErrors } }
    },
    "/goals/history": {
      get: { tags: ["Goals"], summary: "List goal history", ...protectedOperation, responses: { "200": { description: "Goal history", ...jsonSuccess }, ...commonErrors } }
    },
    "/food-entries": {
      post: { tags: ["Food Entries"], summary: "Create a food entry", ...protectedOperation, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NutritionInput" } } } }, responses: { "201": { description: "Food entry created", ...jsonSuccess }, ...commonErrors } },
      get: { tags: ["Food Entries"], summary: "List food entries", ...protectedOperation, parameters: [{ $ref: "#/components/parameters/StartDate" }, { $ref: "#/components/parameters/EndDate" }, { $ref: "#/components/parameters/MealType" }, { $ref: "#/components/parameters/Page" }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated food entries", ...jsonSuccess }, ...commonErrors } }
    },
    "/food-entries/{id}": {
      parameters: [{ $ref: "#/components/parameters/EntryId" }],
      get: { tags: ["Food Entries"], summary: "Get a food entry", ...protectedOperation, responses: { "200": { description: "Food entry", ...jsonSuccess }, ...commonErrors } },
      put: { tags: ["Food Entries"], summary: "Update a food entry", ...protectedOperation, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NutritionInput" } } } }, responses: { "200": { description: "Food entry updated", ...jsonSuccess }, ...commonErrors } },
      delete: { tags: ["Food Entries"], summary: "Delete a food entry", ...protectedOperation, responses: { "200": { description: "Food entry deleted", ...jsonSuccess }, ...commonErrors } }
    },
    "/reports/weekly-calories": {
      get: { tags: ["Reports"], summary: "Get calorie trend", ...protectedOperation, parameters: [{ $ref: "#/components/parameters/StartDateRequired" }, { $ref: "#/components/parameters/EndDateRequired" }], responses: { "200": { description: "Daily calorie trend", ...jsonSuccess }, ...commonErrors } }
    },
    "/reports/macro-breakdown": {
      get: { tags: ["Reports"], summary: "Get macro breakdown", ...protectedOperation, parameters: [{ $ref: "#/components/parameters/StartDateRequired" }, { $ref: "#/components/parameters/EndDateRequired" }], responses: { "200": { description: "Macro totals", ...jsonSuccess }, ...commonErrors } }
    },
    "/reports/goal-comparison": {
      get: { tags: ["Reports"], summary: "Compare a day with the active goal", ...protectedOperation, parameters: [{ $ref: "#/components/parameters/DateRequired" }], responses: { "200": { description: "Goal comparison", ...jsonSuccess }, ...commonErrors } }
    },
    "/dashboard/summary": {
      get: { tags: ["Dashboard"], summary: "Get today’s dashboard summary", ...protectedOperation, responses: { "200": { description: "Dashboard summary", ...jsonSuccess }, ...commonErrors } }
    },
    "/ai/extract-nutrition": {
      post: { tags: ["AI"], summary: "Extract nutrition from an image", ...protectedOperation, requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["image"], properties: { image: { type: "string", format: "binary", description: "Food or nutrition-label image, up to 5 MB." } } } } } }, responses: { "200": { description: "Extracted nutrition", ...jsonSuccess }, ...commonErrors } }
    },
    "/ai/save-entry": {
      post: { tags: ["AI"], summary: "Save reviewed AI nutrition", ...protectedOperation, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NutritionInput" } } } }, responses: { "201": { description: "AI-derived food entry created", ...jsonSuccess }, ...commonErrors } }
    },
    "/chat/message": {
      post: { tags: ["Chat"], summary: "Send a message to the nutrition assistant", ...protectedOperation, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ChatRequest" } } } }, responses: { "200": { description: "Assistant response", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } }, ...commonErrors } }
    },
    "/pdf-import/preview": {
      post: { tags: ["PDF Import"], summary: "Preview food rows from a PDF", ...protectedOperation, requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["pdf"], properties: { pdf: { type: "string", format: "binary", description: "Text-based food diary PDF, up to 10 MB." } } } } } }, responses: { "200": { description: "Parsed PDF rows", ...jsonSuccess }, ...commonErrors } }
    },
    "/pdf-import/confirm": {
      post: { tags: ["PDF Import"], summary: "Confirm PDF rows as food entries", ...protectedOperation, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PdfImportConfirm" } } } }, responses: { "201": { description: "PDF rows imported", ...jsonSuccess }, ...commonErrors } }
    }
  }
};

export const swaggerSpec = swaggerJSDoc({ definition: openApiDefinition, apis: [] });
