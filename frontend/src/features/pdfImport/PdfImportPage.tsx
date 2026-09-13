import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { confirmPdfImport, previewPdfImport } from "./pdfImport.api";
import type { PdfImportEntry } from "./pdfImport.types";
import type { MealType } from "@/features/meals/meal.types";

const mealOptions: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PdfImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<PdfImportEntry[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalCalories = useMemo(() => entries.reduce((sum, entry) => sum + Number(entry.calories || 0), 0), [entries]);

  function handleFile(nextFile: File | null) {
    setError("");
    setSuccess("");
    setEntries([]);
    setExtractedText("");

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setError("Please upload a PDF file.");
      return;
    }

    if (nextFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("PDF must be 10 MB or smaller.");
      return;
    }

    setFile(nextFile);
  }

  async function handlePreview() {
    if (!file) {
      setError("Upload a PDF before previewing rows.");
      return;
    }

    setIsPreviewing(true);
    setError("");
    setSuccess("");

    try {
      const data = await previewPdfImport(file);
      setEntries(data.entries);
      setExtractedText(data.extractedText ?? "");
    } catch (err) {
      setEntries([]);
      setExtractedText("");
      setError(err instanceof Error ? err.message : "Unable to preview PDF import.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleImport() {
    if (!entries.length) {
      setError("Preview and review at least one row before importing.");
      return;
    }

    setIsImporting(true);
    setError("");
    setSuccess("");

    try {
      console.debug("PDF import request payload:", entries);
      const data = await confirmPdfImport(entries);
      setSuccess(`${data.count} food entries imported successfully.`);
      setEntries([]);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import food entries.");
    } finally {
      setIsImporting(false);
    }
  }

  function updateEntry(index: number, field: keyof PdfImportEntry, value: string) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [field]: ["calories", "protein", "carbs", "fat"].includes(field) ? Number(value) : value
            }
          : entry
      )
    );
  }

  function removeEntry(index: number) {
    setEntries((current) => current.filter((_entry, entryIndex) => entryIndex !== index));
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="page-kicker">Bring your history with you</p>
          <h1 className="page-title">PDF Import</h1>
          <p className="page-description">
            Import food diary rows from a text-based tabular PDF, review them, then save them to your meal log.
          </p>
        </div>
        <div className="w-full max-w-2xl rounded-lg border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground lg:w-auto">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-6">
            <div>
              <p className="font-semibold text-foreground">Supported</p>
              <p className="mt-1 leading-5">Text-based tabular PDFs and CSV exports saved as PDF.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Not supported</p>
              <p className="mt-1 leading-5">Scanned, image, or OCR PDFs, or files with lost table columns.</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.38fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1: Upload PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                className={cn(
                  "flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-secondary/20 px-6 py-8 text-center transition-colors",
                  isDragging && "border-primary bg-primary/5"
                )}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  handleFile(event.dataTransfer.files?.[0] ?? null);
                }}
              >
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <span className="mt-4 text-sm font-medium">{file ? file.name : "Drop your PDF here"}</span>
                <span className="mt-1 text-xs text-muted-foreground">PDF only, up to 10 MB</span>
                <Input className="hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
              </label>

              <Button className="w-full" disabled={!file || isPreviewing} onClick={handlePreview}>
                {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isPreviewing ? "Parsing PDF..." : "Preview extracted rows"}
              </Button>
              {import.meta.env.DEV && extractedText ? (
                <details className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">Development: extracted PDF text</summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap">{extractedText}</pre>
                </details>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Required columns: Date, Food Name, Meal Type, Calories, Protein, Carbs, Fat.</p>
              <p>Rows must retain comma, tab, pipe, or clear space-separated column boundaries.</p>
              <p>Preview proceeds only when the required headers and at least one valid row are parsed.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 border-b lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Step 2: Preview extracted rows</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Review and edit rows before importing. Invalid rows will block the whole import.
              </p>
            </div>
            {entries.length ? (
              <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center">
                <div className="rounded-md border bg-secondary/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Imported Rows</p>
                  <p className="font-semibold">{entries.length}</p>
                </div>
                <div className="rounded-md border bg-secondary/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Total Calories</p>
                  <p className="font-semibold">{totalCalories} kcal</p>
                </div>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            {!entries.length ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 text-lg font-semibold">No rows ready to import</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Upload a supported text-based PDF and preview it. Extracted food diary rows will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {entries.map((entry, index) => {
                    const rowError = getRowError(entry);

                    return (
                      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5" key={`${entry.entryDate}-${entry.foodName}-${index}`}>
                        <div className="flex items-start justify-between gap-3 border-b pb-4">
                          <div className="min-w-0 flex-1">
                            <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                              Row {index + 1}
                            </span>
                            <Label className="mt-3 block">Food name</Label>
                            <Input
                              className="mt-2 text-base font-medium"
                              value={entry.foodName}
                              onChange={(event) => updateEntry(index, "foodName", event.target.value)}
                            />
                          </div>
                          <Button size="sm" type="button" variant="ghost" onClick={() => removeEntry(index)}>
                            Remove
                          </Button>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Meal type</Label>
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={entry.mealType}
                              onChange={(event) => updateEntry(index, "mealType", event.target.value)}
                            >
                              {mealOptions.map((mealType) => (
                                <option key={mealType} value={mealType}>
                                  {formatMealType(mealType)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              max={toDateInputValue(new Date())}
                              type="date"
                              value={entry.entryDate}
                              onChange={(event) => updateEntry(index, "entryDate", event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
                            <div className="space-y-2" key={field}>
                              <Label>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                              <div className="relative">
                                <Input
                                  className="pr-14"
                                  min="0"
                                  step={field === "calories" ? "1" : "0.01"}
                                  type="number"
                                  value={entry[field]}
                                  onChange={(event) => updateEntry(index, field, event.target.value)}
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                                  {field === "calories" ? "kcal" : "g"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {rowError ? (
                          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {rowError}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 rounded-md border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label>Step 3: Import entries</Label>
                    <p className="mt-1 text-sm text-muted-foreground">Rows are saved only after confirmation.</p>
                  </div>
                  <Button disabled={isImporting || !entries.length} onClick={handleImport}>
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {isImporting ? "Importing..." : "Import entries"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatMealType(mealType: MealType) {
  return mealType.charAt(0) + mealType.slice(1).toLowerCase();
}

function getRowError(entry: PdfImportEntry) {
  if (!entry.foodName.trim()) {
    return "Food name is required.";
  }

  if (!entry.entryDate) {
    return "Date is required.";
  }

  if (entry.entryDate > toDateInputValue(new Date())) {
    return "Future meal dates are not allowed.";
  }

  if (![entry.calories, entry.protein, entry.carbs, entry.fat].every((value) => Number.isFinite(Number(value)) && Number(value) >= 0)) {
    return "Calories and macro values must be valid non-negative numbers.";
  }

  return null;
}
