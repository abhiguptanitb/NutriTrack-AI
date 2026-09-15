
import { createRequire } from "node:module";
import { env } from "../../config/env.js";
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
const requiredHeaders = ["Date", "Food Name", "Meal Type", "Calories", "Protein", "Carbs", "Fat"];
const headerAliases: Record<string, string[]> = {
  Date: ["date", "entrydate", "loggeddate"],
  "Food Name": ["food", "foodname", "item", "mealitem", "description"],
  "Meal Type": ["meal", "mealtype", "category"],
  Calories: ["calories", "calorie", "kcal", "energy"],
  Protein: ["protein", "prot"],
  Carbs: ["carbs", "carbohydrates", "carbohydrate"],
  Fat: ["fat", "fats"]
};

export class PdfImportService {
  async preview(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new AppError("PDF file is required", 400);
    }

    const text = await this.extractText(file.buffer);
    const entries = this.parseEntries(text);

    if (!entries.length) {
      throw new AppError(
        "Unsupported PDF format: no valid tabular rows could be parsed. Use a text-based table or CSV exported to PDF with preserved column separators.",
        400
      );
    }

    return {
      entries,
      ...(env.NODE_ENV !== "production" ? { extractedText: text } : {})
    };
  }

  async confirm(userId: string, entries: PreviewEntry[]) {
    console.debug("PDF import raw rows:", entries);
    const validatedEntries = entries.map((entry, index) => this.validateEntry(entry, index));
    console.debug("PDF import mapped DTOs:", validatedEntries);
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

      console.debug("PDF extracted text:\n", text);

      return text;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to parse PDF text", 400);
    }
  }

  private parseEntries(text: string): PreviewEntry[] {
    // PDF extraction often loses table layout, so rows are normalized before parsing.
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const headerMatch = this.findHeader(lines);
    if (!headerMatch) {
      console.debug("PDF detected headers:", []);
      throw new AppError("Missing required columns: Date, Food Name, Meal Type, Calories, Protein, Carbs, Fat", 400);
    }

    const detectedHeaders = this.detectHeaders(headerMatch.text);
    console.debug("PDF detected headers:", detectedHeaders);
    console.debug("PDF normalized headers:", detectedHeaders.map((header) => this.normalizeHeader(header)));

    const entries: PreviewEntry[] = [];
    const candidateLines = lines.slice(headerMatch.endIndex + 1);

    for (const line of candidateLines) {
      const entry = this.parseLine(line);

      if (entry) {
        entries.push(entry);
      }
    }

    console.debug("PDF parsed rows:", entries);
    return entries;
  }

  private isSupportedHeader(line: string) {
    return this.detectHeaders(line).length === requiredHeaders.length;
  }

  private findHeader(lines: string[]) {
    for (let startIndex = 0; startIndex < lines.length; startIndex += 1) {
      for (let span = 1; span <= Math.min(requiredHeaders.length, lines.length - startIndex); span += 1) {
        // Some PDF generators split headers across lines, so test a small multi-line window.
        const text = lines.slice(startIndex, startIndex + span).join(" ");
        if (this.isSupportedHeader(text)) {
          return { text, endIndex: startIndex + span - 1 };
        }
      }
    }

    return null;
  }

  private detectHeaders(line: string) {
    const normalized = this.normalizeHeader(line);
    return requiredHeaders.filter((header) => headerAliases[header].some((alias) => normalized.includes(alias)));
  }

  private normalizeHeader(value: string) {
    return value.replace(/\s+/g, "").toLowerCase();
  }

  private parseLine(line: string): PreviewEntry | null {
    // Try the most specific parser first, then fall back to common table delimiters.
    return this.parseMealAnchoredLine(line) ?? this.parseDelimitedLine(line) ?? this.parseSpaceSeparatedLine(line);
  }

  private parseMealAnchoredLine(line: string): PreviewEntry | null {
    const dateMatch = line.match(new RegExp(`^(${datePattern})`, "i"));
    if (!dateMatch) {
      return null;
    }

    const remainder = line.slice(dateMatch[0].length);
    const mealMatch = remainder.match(new RegExp(`(${mealPattern})(?=$|[^a-z])`, "i"));
    if (!mealMatch || mealMatch.index === undefined) {
      return null;
    }

    const foodName = remainder.slice(0, mealMatch.index).trim();
    const nutritionText = remainder.slice(mealMatch.index + mealMatch[0].length).trim();
    if (!foodName || !nutritionText) {
      return null;
    }

    // This handles rows where date, food, and meal type survived but separators between macros changed.
    const separatedValues = nutritionText.match(/^(\d+(?:\.\d+)?)[\s,|]+(\d+(?:\.\d+)?)[\s,|]+(\d+(?:\.\d+)?)[\s,|]+(\d+(?:\.\d+)?)$/);
    if (separatedValues) {
      return this.toPreviewEntry({
        date: dateMatch[1],
        foodName,
        mealType: mealMatch[1],
        calories: separatedValues[1],
        protein: separatedValues[2],
        carbs: separatedValues[3],
        fat: separatedValues[4]
      });
    }

    const compactValues = nutritionText.match(/^(\d{2,4})(\d{2})(\d{2})(\d{1,2})$/);
    if (!compactValues) {
      return null;
    }

    return this.toPreviewEntry({
      date: dateMatch[1],
      foodName,
      mealType: mealMatch[1],
      calories: compactValues[1],
      protein: compactValues[2],
      carbs: compactValues[3],
      fat: compactValues[4]
    });
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
    console.debug(`PDF import raw row ${index + 1}:`, entry);
    const { error, value } = pdfImportEntrySchema.validate(entry, { stripUnknown: true, convert: false });

    if (error) {
      throw new AppError(`Row ${index + 1} is invalid: ${error.details[0]?.message ?? "Invalid food entry"}`, 400);
    }

    if (new Date(value.entryDate).getTime() > Date.now()) {
      throw new AppError("Food entries cannot be created for a future date.", 400);
    }

    const mappedEntry = {
      entryDate: value.entryDate,
      foodName: value.foodName,
      mealType: value.mealType,
      calories: value.calories,
      protein: value.protein,
      carbs: value.carbs,
      fat: value.fat
    } as PdfImportFoodEntryData;
    console.debug(`PDF import validated row ${index + 1}:`, mappedEntry);

    return {
      ...mappedEntry,
      entryDate: new Date(mappedEntry.entryDate)
    };
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
    // Prefer MM/DD/YYYY, but allow DD/MM/YYYY when the first value cannot be a month.
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
