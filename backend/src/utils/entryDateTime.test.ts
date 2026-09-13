import assert from "node:assert/strict";
import test from "node:test";
import { assertEntryDateTimeNotFuture, parseEntryDateTime } from "./entryDateTime.js";

test("converts 12-hour input to 24-hour local time", () => {
  const afternoon = parseEntryDateTime("10 Sep 2026", "01:30 PM");
  const midnight = parseEntryDateTime("2026-09-13", "12:00 AM");
  const noon = parseEntryDateTime("13-09-2026", "12:00 PM");

  assert.equal(afternoon.getHours(), 13);
  assert.equal(afternoon.getMinutes(), 30);
  assert.equal(midnight.getHours(), 0);
  assert.equal(noon.getHours(), 12);
});

test("accepts 24-hour input", () => {
  const entryDate = parseEntryDateTime("13-09-2026", "17:30");

  assert.equal(entryDate.getFullYear(), 2026);
  assert.equal(entryDate.getMonth(), 8);
  assert.equal(entryDate.getDate(), 13);
  assert.equal(entryDate.getHours(), 17);
  assert.equal(entryDate.getMinutes(), 30);
});

test("defaults missing date and time independently", () => {
  const now = new Date(2026, 8, 13, 15, 49, 42);
  const dateOnly = parseEntryDateTime("12 Sep 2026", undefined, now);
  const neither = parseEntryDateTime(undefined, undefined, now);

  assert.equal(dateOnly.getFullYear(), 2026);
  assert.equal(dateOnly.getMonth(), 8);
  assert.equal(dateOnly.getDate(), 12);
  assert.equal(dateOnly.getHours(), 15);
  assert.equal(dateOnly.getMinutes(), 49);
  assert.equal(neither.getTime(), new Date(2026, 8, 13, 15, 49).getTime());
});

test("rejects future dates and future times", () => {
  assert.throws(
    () => assertEntryDateTimeNotFuture(parseEntryDateTime("20 Sep 2026", "08:00")),
    /Food entries cannot be logged in the future\. Please select a current or past date and time\./
  );

  const now = new Date();
  const futureMinutes = new Date(now.getTime() + 60_000);
  const futureTime = `${String(futureMinutes.getHours()).padStart(2, "0")}:${String(futureMinutes.getMinutes()).padStart(2, "0")}`;
  assert.throws(
    () => assertEntryDateTimeNotFuture(parseEntryDateTime(undefined, futureTime)),
    /Food entries cannot be logged in the future\. Please select a current or past date and time\./
  );
});
