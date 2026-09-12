
import { createRequire } from "node:module";
import { AppError } from "../../utils/appError.js";
import { PdfImportRepository, type PdfImportFoodEntryData } from "./pdfImport.repository.js";
import { pdfImportEntrySchema } from "./pdfImport.validator.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

type PreviewEntry = {
  entryDate: string;
  foodName: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const pdfImportRepository = new PdfImportRepository();

const datePattern = String.raw`(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})`;
const mealPattern = String.raw`(?:breakfast|lunch|dinner|snacks?|snack)`;

export class PdfImportService {
  async preview(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new AppError("PDF file is required", 400);
    }

    const text = await this.extractText(file.buffer);
    const entries = this.parseEntries(text);

    if (!entries.length) {
      throw new AppError("No valid food diary rows were found in this PDF", 400);
    }

    return { entries };
  }

  async confirm(userId: string, entries: PreviewEntry[]) {
    const validatedEntries = entries.map((entry, index) => this.validateEntry(entry, index));
    const count = await pdfImportRepository.createMany(userId, validatedEntries);

    return {
      count
    };
  }

  private async extractText(buffer: Buffer) {
    try {
      const result = await pdfParse(buffer);

      const text = result.text.trim();
      if (!text) {
        throw new AppError("The PDF does not contain extractable text", 400);
      }

      return text;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to parse PDF text", 400);
    }
  }

  private parseEntries(text: string): PreviewEntry[] {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const headerIndex = lines.findIndex((line) => this.isSupportedHeader(line));
    if (headerIndex === -1) {
      throw new AppError("Missing required columns: Date, Food Name, Meal Type, Calories, Protein, Carbs, Fat", 400);
    }

    const entries: PreviewEntry[] = [];
    const candidateLines = lines.slice(headerIndex + 1);

    for (const line of candidateLines) {
      const entry = this.parseLine(line);

      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  private isSupportedHeader(line: string) {
    const normalized = line.toLowerCase();
    const hasDate = /\b(date|entry date|logged date)\b/.test(normalized);
    const hasFood = /\b(food|food name|item|meal item|description)\b/.test(normalized);
    const hasMeal = /\b(meal|meal type|category)\b/.test(normalized);
    const hasCalories = /\b(calories|calorie|kcal|energy)\b/.test(normalized);
    const hasProtein = /\b(protein|prot)\b/.test(normalized);
    const hasCarbs = /\b(carbs|carbohydrates|carbohydrate)\b/.test(normalized);
    const hasFat = /\b(fat|fats)\b/.test(normalized);

    return hasDate && hasFood && hasMeal && hasCalories && hasProtein && hasCarbs && hasFat;
  }

  private parseLine(line: string): PreviewEntry | null {
    return this.parseDelimitedLine(line) ?? this.parseSpaceSeparatedLine(line);
  }

  private parseDelimitedLine(line: string): PreviewEntry | null {
    const delimiter = ["|", "\t", ","].find((item) => line.includes(item));
    if (!delimiter) {
      return null;
    }

    const columns = line
      .split(delimiter)
      .map((column) => column.trim())
      .filter(Boolean);

    if (columns.length < 7) {
      return null;
    }

    return this.toPreviewEntry({
      date: columns[0],
      foodName: columns[1],
      mealType: columns[2],
      calories: columns[3],
      protein: columns[4],
      carbs: columns[5],
      fat: columns[6]
    });
  }

  private parseSpaceSeparatedLine(line: string): PreviewEntry | null {
    const regex = new RegExp(
      `^(${datePattern})\\s+(.+?)\\s+(${mealPattern})\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)$`,
      "i"
    );
    const match = line.match(regex);

    if (!match) {
      return null;
    }

    return this.toPreviewEntry({
      date: match[1],
      foodName: match[2],
      mealType: match[3],
      calories: match[4],
      protein: match[5],
      carbs: match[6],
      fat: match[7]
    });
  }

  private toPreviewEntry(row: {
    date: string;
    foodName: string;
    mealType: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }): PreviewEntry | null {
    const entryDate = this.parseDate(row.date);
    const mealType = this.parseMealType(row.mealType);

    if (!entryDate || !mealType) {
      return null;
    }

    const entry = {
      entryDate,
      foodName: row.foodName.trim(),
      mealType,
      calories: Math.round(this.parseNumber(row.calories)),
      protein: this.parseNumber(row.protein),
      carbs: this.parseNumber(row.carbs),
      fat: this.parseNumber(row.fat)
    };

    const { error, value } = pdfImportEntrySchema.validate(entry, { stripUnknown: true });
    return error ? null : (value as PreviewEntry);
  }

  private validateEntry(entry: PreviewEntry, index: number): PdfImportFoodEntryData {
    const { error, value } = pdfImportEntrySchema.validate(entry, { stripUnknown: true });

    if (error) {
      throw new AppError(`Row ${index + 1} is invalid: ${error.details[0]?.message ?? "Invalid food entry"}`, 400);
    }

    return {
      ...value,
      entryDate: new Date(value.entryDate)
    } as PdfImportFoodEntryData;
  }

  private parseDate(value: string) {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return this.toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }

    const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!slashMatch) {
      return null;
    }

    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = this.normalizeYear(Number(slashMatch[3]));
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;

    return this.toIsoDate(year, month, day);
  }

  private toIsoDate(year: number, month: number, day: number) {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }

    return date.toISOString().slice(0, 10);
  }

  private normalizeYear(year: number) {
    return year < 100 ? 2000 + year : year;
  }

  private parseMealType(value: string): PreviewEntry["mealType"] | null {
    const normalized = value.trim().toUpperCase();

    if (normalized === "SNACK" || normalized === "SNACKS") {
      return "SNACKS";
    }

    if (["BREAKFAST", "LUNCH", "DINNER"].includes(normalized)) {
      return normalized as PreviewEntry["mealType"];
    }

    return null;
  }

  private parseNumber(value: string) {
    const numberValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(numberValue) && numberValue >= 0 ? Number(numberValue.toFixed(2)) : Number.NaN;
  }
}
