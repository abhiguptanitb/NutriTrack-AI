import { AppError } from "./appError.js";

export const futureEntryDateTimeMessage =
  "Food entries cannot be logged in the future. Please select a current or past date and time.";

const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parseEntryDateTime(dateValue?: unknown, timeValue?: unknown, now = new Date()) {
  const date = parseDate(dateValue, now);
  const time = parseTime(timeValue, now);
  // Build a local Date so separate date and time inputs match the user's local logging context.
  const entryDate = new Date(date.year, date.month, date.day, time.hours, time.minutes, 0, 0);

  if (Number.isNaN(entryDate.getTime())) {
    throw new AppError("Invalid entry date or time.", 400);
  }

  return entryDate;
}

export function assertEntryDateTimeNotFuture(entryDate: Date) {
  if (entryDate.getTime() > Date.now()) {
    throw new AppError(futureEntryDateTimeMessage, 400);
  }
}

function parseDate(value: unknown, now: Date) {
  if (value === undefined || value === null || value === "") {
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }

  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let year: number;
  let month: number;
  let day: number;

  if (match) {
    year = Number(match[1]);
    month = Number(match[2]) - 1;
    day = Number(match[3]);
  } else if ((match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) {
    day = Number(match[1]);
    month = Number(match[2]) - 1;
    year = Number(match[3]);
  } else if ((match = text.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/))) {
    day = Number(match[1]);
    month = monthNames.indexOf(match[2].slice(0, 3).toLowerCase());
    year = Number(match[3]);
  } else {
    throw new AppError("Invalid entry date.", 400);
  }

  const candidate = new Date(year, month, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month || candidate.getDate() !== day) {
    throw new AppError("Invalid entry date.", 400);
  }

  return { year, month, day };
}

function parseTime(value: unknown, now: Date) {
  if (value === undefined || value === null || value === "") {
    return { hours: now.getHours(), minutes: now.getMinutes() };
  }

  const text = String(value).trim().toUpperCase();
  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) {
    throw new AppError("Invalid entry time.", 400);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (minutes > 59 || (period && (hours < 1 || hours > 12)) || (!period && hours > 23)) {
    throw new AppError("Invalid entry time.", 400);
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  } else if (period === "PM" && hours !== 12) {
    // Store AM/PM input as 24-hour time before persistence and comparisons.
    hours += 12;
  }

  return { hours, minutes };
}
