import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Loader2, Save, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractNutrition, saveAiFoodEntry } from "./aiUpload.api";
import type { ExtractedNutrition } from "./aiUpload.types";
import type { MealType } from "@/features/meals/meal.types";

type ReviewForm = {
  foodName: string;
  quantity: string;
  unit: string;
  mealType: MealType;
  entryDate: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

const mealOptions: Array<{ value: MealType; label: string }> = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACKS", label: "Snacks" }
];

const emptyForm: ReviewForm = {
  foodName: "",
  quantity: "",
  unit: "",
  mealType: "BREAKFAST",
  entryDate: new Date().toISOString().slice(0, 10),
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: ""
};

export function AiUploadPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [hasResult, setHasResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const canAnalyze = Boolean(image) && !isAnalyzing;
  const canSave = hasResult && !isSaving && !isAnalyzing;

  const nutritionPreview = useMemo(
    () => [
      { label: "Calories", value: form.calories || "0", suffix: "kcal" },
      { label: "Protein", value: form.protein || "0", suffix: "g" },
      { label: "Carbs", value: form.carbs || "0", suffix: "g" },
      { label: "Fat", value: form.fat || "0", suffix: "g" }
    ],
    [form.calories, form.carbs, form.fat, form.protein]
  );

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImage(file);
    setError("");
    setSuccess("");
    setHasResult(false);
  }

  async function handleAnalyze() {
    if (!image) {
      setError("Please upload a food image before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setSuccess("");

    try {
      const data = await extractNutrition(image);
      setForm(toReviewForm(data.nutrition));
      setHasResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze the image.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasResult) {
      setError("Analyze an image before saving a food entry.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await saveAiFoodEntry({
        foodName: form.foodName.trim(),
        quantity: toNumber(form.quantity),
        unit: form.unit.trim(),
        mealType: form.mealType,
        entryDate: form.entryDate,
        calories: Math.round(toNumber(form.calories)),
        protein: toNumber(form.protein),
        carbs: toNumber(form.carbs),
        fat: toNumber(form.fat),
        fiber: toNumber(form.fiber)
      });

      setSuccess("Food entry saved successfully.");
      setHasResult(false);
      setImage(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the food entry.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof ReviewForm>(field: K, value: ReviewForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-kicker">Gemini vision workflow</p>
          <h1 className="page-title">AI Nutrition Extraction</h1>
          <p className="page-description">
            Upload a food photo, analyze it with Gemini, review the estimates, then save it to your meal log.
          </p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          AI-generated nutrition estimates may not always be accurate. Please review before saving.
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

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.45fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" />
                Step 1: Upload image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="file" accept="image/*" onChange={handleImageChange} />
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border bg-secondary/40">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected food preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Camera className="h-8 w-8" />
                    Food image preview
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                Step 2: Analyze with AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gemini estimates serving details and nutrition from the uploaded image. Nothing is saved until you review it.
              </p>
              <Button className="w-full" disabled={!canAnalyze} onClick={handleAnalyze}>
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isAnalyzing ? "Analyzing image..." : "Analyze with AI"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3: Review extracted nutrition</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasResult ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-md border border-dashed bg-secondary/20 p-8 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 text-lg font-semibold">No nutrition estimate yet</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Upload an image and run AI analysis. The extracted values will appear here for review before saving.
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSave}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {nutritionPreview.map((item) => (
                    <div key={item.label} className="rounded-md border bg-secondary/20 p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {item.value}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">{item.suffix}</span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Food name" value={form.foodName} onChange={(value) => updateField("foodName", value)} />
                  <div className="space-y-2">
                    <Label>Meal type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={form.mealType}
                      onChange={(event) => updateField("mealType", event.target.value as MealType)}
                    >
                      {mealOptions.map((meal) => (
                        <option key={meal.value} value={meal.value}>
                          {meal.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Field label="Quantity" type="number" value={form.quantity} onChange={(value) => updateField("quantity", value)} />
                  <Field label="Unit" value={form.unit} onChange={(value) => updateField("unit", value)} />
                  <Field label="Entry date" type="date" value={form.entryDate} onChange={(value) => updateField("entryDate", value)} />
                  <Field label="Calories" type="number" value={form.calories} onChange={(value) => updateField("calories", value)} />
                  <Field label="Protein (g)" type="number" value={form.protein} onChange={(value) => updateField("protein", value)} />
                  <Field label="Carbs (g)" type="number" value={form.carbs} onChange={(value) => updateField("carbs", value)} />
                  <Field label="Fat (g)" type="number" value={form.fat} onChange={(value) => updateField("fat", value)} />
                  <Field label="Fiber (g)" type="number" value={form.fiber} onChange={(value) => updateField("fiber", value)} />
                </div>

                <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Step 4: Save food entry</p>
                    <p className="text-sm text-muted-foreground">This creates a meal record with source set to AI image.</p>
                  </div>
                  <Button disabled={!canSave} type="submit">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save Food Entry"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  type?: "text" | "number" | "date";
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function toReviewForm(nutrition: ExtractedNutrition): ReviewForm {
  return {
    foodName: nutrition.foodName,
    quantity: String(nutrition.quantity || 1),
    unit: nutrition.unit,
    mealType: "BREAKFAST",
    entryDate: new Date().toISOString().slice(0, 10),
    calories: String(nutrition.calories),
    protein: String(nutrition.protein),
    carbs: String(nutrition.carbs),
    fat: String(nutrition.fat),
    fiber: String(nutrition.fiber)
  };
}

function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
