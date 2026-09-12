import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Edit2,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveGoal } from "@/features/goals/goals.api";
import type { NutritionGoal } from "@/features/goals/goal.types";
import { cn } from "@/lib/utils";
import { createFoodEntry, deleteFoodEntry, listFoodEntries, updateFoodEntry } from "./meals.api";
import type {
  EntrySource,
  FoodEntry,
  FoodEntryFilters,
  FoodEntryFormValues,
  FoodEntryPayload,
  MealType,
  PaginationMeta
} from "./meal.types";

const mealTypes: Array<{ value: MealType; label: string }> = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACKS", label: "Snacks" }
];

const sources: Array<{ value: EntrySource; label: string }> = [
  { value: "MANUAL", label: "Manual" },
  { value: "AI_IMAGE", label: "AI Image" }
];

const emptyForm: FoodEntryFormValues = {
  foodName: "",
  quantity: "1",
  unit: "serving",
  mealType: "BREAKFAST",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  entryDate: toDateTimeLocalValue(new Date()),
  source: "MANUAL"
};

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDateTimeLocalValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function foodEntryToForm(entry: FoodEntry): FoodEntryFormValues {
  return {
    foodName: entry.foodName,
    quantity: String(entry.quantity),
    unit: entry.unit ?? "",
    mealType: entry.mealType,
    calories: String(entry.calories),
    protein: String(entry.protein),
    carbs: String(entry.carbs),
    fat: String(entry.fat),
    fiber: entry.fiber === null ? "" : String(entry.fiber),
    entryDate: toDateTimeLocalValue(new Date(entry.entryDate)),
    source: entry.source
  };
}

function toPayload(form: FoodEntryFormValues): FoodEntryPayload {
  return {
    foodName: form.foodName.trim(),
    quantity: Number(form.quantity),
    unit: form.unit.trim() || undefined,
    mealType: form.mealType,
    calories: Number(form.calories),
    protein: Number(form.protein),
    carbs: Number(form.carbs),
    fat: Number(form.fat),
    fiber: form.fiber ? Number(form.fiber) : undefined,
    entryDate: new Date(form.entryDate).toISOString(),
    source: form.source
  };
}

function formatNumber(value: string | number | null, maximumFractionDigits = 1) {
  if (value === null || value === "") {
    return "-";
  }

  return Number(value).toLocaleString(undefined, { maximumFractionDigits });
}

function formatMealType(value: MealType) {
  return mealTypes.find((mealType) => mealType.value === value)?.label ?? value;
}

function formatSource(value: EntrySource) {
  return sources.find((source) => source.value === value)?.label ?? value;
}

function getTodayRange() {
  const today = new Date();
  return {
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(today)
  };
}

function getProgressPercent(consumed: number, target: string | number | null | undefined) {
  const numericTarget = Number(target ?? 0);
  if (!numericTarget) {
    return 0;
  }

  return Math.round((consumed / numericTarget) * 100);
}

export function MealsPage() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [todayEntries, setTodayEntries] = useState<FoodEntry[]>([]);
  const [activeGoal, setActiveGoal] = useState<NutritionGoal | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [filters, setFilters] = useState<FoodEntryFilters>({
    startDate: "",
    endDate: "",
    mealType: "",
    page: 1,
    limit: 10
  });
  const [draftFilters, setDraftFilters] = useState({
    startDate: "",
    endDate: "",
    mealType: "" as MealType | ""
  });
  const [form, setForm] = useState<FoodEntryFormValues>(emptyForm);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<FoodEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(editingEntryId);

  const todaySummary = useMemo(
    () =>
      todayEntries.reduce(
        (totals, entry) => ({
          calories: totals.calories + entry.calories,
          protein: totals.protein + Number(entry.protein),
          carbs: totals.carbs + Number(entry.carbs),
          fat: totals.fat + Number(entry.fat)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [todayEntries]
  );

  const mealSummary = useMemo(
    () =>
      mealTypes.map((mealType) => ({
        ...mealType,
        calories: todayEntries
          .filter((entry) => entry.mealType === mealType.value)
          .reduce((total, entry) => total + entry.calories, 0)
      })),
    [todayEntries]
  );

  const kpis = useMemo(
    () => [
      {
        label: "Calories Today",
        value: formatNumber(todaySummary.calories, 0),
        unit: "kcal",
        target: activeGoal?.dailyCalories ?? null,
        percent: getProgressPercent(todaySummary.calories, activeGoal?.dailyCalories)
      },
      {
        label: "Protein Today",
        value: formatNumber(todaySummary.protein),
        unit: "g",
        target: activeGoal?.proteinGrams ?? null,
        percent: getProgressPercent(todaySummary.protein, activeGoal?.proteinGrams)
      },
      {
        label: "Carbs Today",
        value: formatNumber(todaySummary.carbs),
        unit: "g",
        target: activeGoal?.carbGrams ?? null,
        percent: getProgressPercent(todaySummary.carbs, activeGoal?.carbGrams)
      },
      {
        label: "Fat Today",
        value: formatNumber(todaySummary.fat),
        unit: "g",
        target: activeGoal?.fatGrams ?? null,
        percent: getProgressPercent(todaySummary.fat, activeGoal?.fatGrams)
      }
    ],
    [activeGoal, todaySummary]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadEntries() {
      setIsLoading(true);
      setError("");

      try {
        const response = await listFoodEntries(filters);
        if (!isMounted) {
          return;
        }

        setEntries(response.items);
        setPagination(response.pagination);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load food entries");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  async function refreshEntries(nextPage = filters.page) {
    const response = await listFoodEntries({ ...filters, page: nextPage });
    setEntries(response.items);
    setPagination(response.pagination);
    setFilters((current) => ({ ...current, page: nextPage }));
  }

  async function refreshTodayContext() {
    const todayRange = getTodayRange();
    const [todayResponse, goalResponse] = await Promise.all([
      listFoodEntries({ ...todayRange, mealType: "", page: 1, limit: 100 }),
      getActiveGoal()
    ]);

    setTodayEntries(todayResponse.items);
    setActiveGoal(goalResponse.goal);
  }

  useEffect(() => {
    refreshTodayContext().catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to load today's nutrition summary");
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const payload = toPayload(form);
      if (editingEntryId) {
        await updateFoodEntry(editingEntryId, payload);
        setSuccessMessage("Food entry updated successfully.");
      } else {
        await createFoodEntry(payload);
        setSuccessMessage("Food entry created successfully.");
      }

      setForm({ ...emptyForm, entryDate: toDateTimeLocalValue(new Date()) });
      setEditingEntryId(null);
      await refreshEntries(editingEntryId ? filters.page : 1);
      await refreshTodayContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save food entry");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!entryToDelete) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsDeleting(true);

    try {
      await deleteFoodEntry(entryToDelete.id);
      setEntryToDelete(null);
      setSuccessMessage("Food entry deleted successfully.");
      const nextPage = entries.length === 1 && filters.page > 1 ? filters.page - 1 : filters.page;
      await refreshEntries(nextPage);
      await refreshTodayContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete food entry");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEdit(entry: FoodEntry) {
    setEditingEntryId(entry.id);
    setForm(foodEntryToForm(entry));
    setSuccessMessage("");
    setError("");
  }

  function handleCancelEdit() {
    setEditingEntryId(null);
    setForm({ ...emptyForm, entryDate: toDateTimeLocalValue(new Date()) });
    setError("");
  }

  function applyFilters() {
    setFilters((current) => ({
      ...current,
      ...draftFilters,
      page: 1
    }));
  }

  function resetFilters() {
    setDraftFilters({ startDate: "", endDate: "", mealType: "" });
    setFilters((current) => ({
      ...current,
      startDate: "",
      endDate: "",
      mealType: "",
      page: 1
    }));
  }

  function goToPage(page: number) {
    setFilters((current) => ({
      ...current,
      page: Math.min(Math.max(page, 1), Math.max(pagination.totalPages, 1))
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Meals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log meals, review nutrition history, and filter entries by date or meal type.
          </p>
        </div>
        <Button onClick={() => setForm({ ...emptyForm, entryDate: toDateTimeLocalValue(new Date()) })}>
          <Plus className="h-4 w-4" />
          New meal
        </Button>
      </div>

      {error ? (
        <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-3 text-sm text-primary">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.43fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Food Entry" : "Create Food Entry"}</CardTitle>
              <CardDescription>
                Capture calories, macros, meal type, and the date this food was eaten.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="foodName">Food name</Label>
                  <Input
                    id="foodName"
                    onChange={(event) => setForm((current) => ({ ...current, foodName: event.target.value }))}
                    placeholder="Grilled chicken rice bowl"
                    required
                    value={form.foodName}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      min="0.01"
                      onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                      required
                      step="0.01"
                      type="number"
                      value={form.quantity}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                      placeholder="serving, bowl, g"
                      value={form.unit}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    id="mealType"
                    label="Meal type"
                    onChange={(value) => setForm((current) => ({ ...current, mealType: value as MealType }))}
                    options={mealTypes}
                    value={form.mealType}
                  />
                  <SelectField
                    id="source"
                    label="Source"
                    onChange={(value) => setForm((current) => ({ ...current, source: value as EntrySource }))}
                    options={sources}
                    value={form.source}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Calories"
                    name="calories"
                    onChange={(value) => setForm((current) => ({ ...current, calories: value }))}
                    required
                    suffix="kcal"
                    value={form.calories}
                  />
                  <NumberField
                    label="Protein"
                    name="protein"
                    onChange={(value) => setForm((current) => ({ ...current, protein: value }))}
                    required
                    suffix="g"
                    value={form.protein}
                  />
                  <NumberField
                    label="Carbs"
                    name="carbs"
                    onChange={(value) => setForm((current) => ({ ...current, carbs: value }))}
                    required
                    suffix="g"
                    value={form.carbs}
                  />
                  <NumberField
                    label="Fat"
                    name="fat"
                    onChange={(value) => setForm((current) => ({ ...current, fat: value }))}
                    required
                    suffix="g"
                    value={form.fat}
                  />
                  <NumberField
                    label="Fiber"
                    name="fiber"
                    onChange={(value) => setForm((current) => ({ ...current, fiber: value }))}
                    suffix="g"
                    value={form.fiber}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="entryDate">Entry date</Label>
                    <Input
                      id="entryDate"
                      onChange={(event) => setForm((current) => ({ ...current, entryDate: event.target.value }))}
                      required
                      type="datetime-local"
                      value={form.entryDate}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button disabled={isSubmitting} type="submit">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : isEditing ? (
                      "Update entry"
                    ) : (
                      "Create entry"
                    )}
                  </Button>
                  {isEditing ? (
                    <Button disabled={isSubmitting} onClick={handleCancelEdit} type="button" variant="outline">
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <SummaryCard
                key={kpi.label}
                label={kpi.label}
                percent={kpi.percent}
                target={kpi.target}
                unit={kpi.unit}
                value={kpi.value}
              />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today's Meal Summary</CardTitle>
              <CardDescription>Calories consumed today by meal type.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {mealSummary.map((meal) => (
                  <div className="rounded-md border bg-background p-4" key={meal.value}>
                    <p className="text-sm font-medium">{meal.label}</p>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-2xl font-semibold">{formatNumber(meal.calories, 0)}</span>
                      <span className="pb-1 text-sm text-muted-foreground">kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Food Entries</CardTitle>
              <CardDescription>Newest entries appear first. Use filters to narrow the list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    onChange={(event) =>
                      setDraftFilters((current) => ({ ...current, startDate: event.target.value }))
                    }
                    type="date"
                    value={draftFilters.startDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))}
                    type="date"
                    value={draftFilters.endDate}
                  />
                </div>
                <SelectField
                  id="filterMealType"
                  label="Meal type"
                  onChange={(value) => setDraftFilters((current) => ({ ...current, mealType: value as MealType | "" }))}
                  options={[{ value: "", label: "All meals" }, ...mealTypes]}
                  value={draftFilters.mealType}
                />
                <div className="flex items-end">
                  <Button className="w-full" onClick={applyFilters} type="button">
                    <Search className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={resetFilters} type="button" variant="outline">
                    <RefreshCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex h-72 items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading food entries...
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-secondary/40 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-sm">
                    <Utensils className="h-7 w-7 text-primary" />
                  </div>
                  <p className="mt-4 text-base font-semibold">No meals match this view</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Add your first meal for today, or clear the filters to review your full nutrition history.
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    <Button onClick={() => setForm({ ...emptyForm, entryDate: toDateTimeLocalValue(new Date()) })}>
                      <Plus className="h-4 w-4" />
                      Add meal
                    </Button>
                    <Button onClick={resetFilters} type="button" variant="outline">
                      Clear filters
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Food</th>
                          <th className="px-4 py-3 font-medium">Meal</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Calories</th>
                          <th className="px-4 py-3 font-medium">Macros</th>
                          <th className="px-4 py-3 font-medium">Source</th>
                          <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {entries.map((entry) => (
                          <tr className="bg-card" key={entry.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium">{entry.foodName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(entry.quantity)} {entry.unit}
                              </p>
                            </td>
                            <td className="px-4 py-3">{formatMealType(entry.mealType)}</td>
                            <td className="px-4 py-3">{new Date(entry.entryDate).toLocaleString()}</td>
                            <td className="px-4 py-3">{formatNumber(entry.calories, 0)} kcal</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              P {formatNumber(entry.protein)}g / C {formatNumber(entry.carbs)}g / F{" "}
                              {formatNumber(entry.fat)}g
                            </td>
                            <td className="px-4 py-3">
                              <SourceBadge source={entry.source} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button onClick={() => handleEdit(entry)} size="icon" type="button" variant="ghost">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => setEntryToDelete(entry)}
                                  size="icon"
                                  type="button"
                                  variant="ghost"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y lg:hidden">
                    {entries.map((entry) => (
                      <div className="space-y-3 bg-card p-4" key={entry.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{entry.foodName}</p>
                            <p className="text-sm text-muted-foreground">{formatMealType(entry.mealType)}</p>
                          </div>
                          <SourceBadge source={entry.source} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <MobileDetail label="Quantity" value={`${formatNumber(entry.quantity)} ${entry.unit ?? ""}`} />
                          <MobileDetail label="Date" value={toDateInputValue(new Date(entry.entryDate))} />
                          <MobileDetail label="Calories" value={`${formatNumber(entry.calories, 0)} kcal`} />
                          <MobileDetail label="Protein" value={`${formatNumber(entry.protein)} g`} />
                          <MobileDetail label="Carbs" value={`${formatNumber(entry.carbs)} g`} />
                          <MobileDetail label="Fat" value={`${formatNumber(entry.fat)} g`} />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEdit(entry)} size="sm" type="button" variant="outline">
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button onClick={() => setEntryToDelete(entry)} size="sm" type="button" variant="outline">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col justify-between gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
                <p>
                  Showing {entries.length} of {pagination.total} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() => goToPage(pagination.page - 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <span className="min-w-24 text-center">
                    Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                  </span>
                  <Button
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() => goToPage(pagination.page + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {entryToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete food entry?</CardTitle>
              <CardDescription>
                This will permanently remove "{entryToDelete.foodName}" from your meal history.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button disabled={isDeleting} onClick={() => setEntryToDelete(null)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={isDeleting} onClick={handleDelete} type="button">
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete entry"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  name,
  onChange,
  required,
  suffix,
  value
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  suffix: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          className="pr-12"
          id={name}
          min="0"
          onChange={(event) => onChange(event.target.value)}
          required={required}
          step={name === "calories" ? 1 : 0.1}
          type="number"
          value={value}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function SelectField({
  id,
  label,
  onChange,
  options,
  value
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryCard({
  label,
  percent,
  target,
  unit,
  value
}: {
  label: string;
  percent: number;
  target: string | number | null;
  unit: string;
  value: string;
}) {
  const cappedPercent = Math.min(percent, 100);
  const hasTarget = Boolean(Number(target ?? 0));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
              percent >= 100 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            )}
          >
            <ArrowUpRight className="h-3 w-3" />
            {hasTarget ? `${percent}%` : "No goal"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-semibold">{value}</span>
          <span className="pb-1 text-sm text-muted-foreground">{unit}</span>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${hasTarget ? cappedPercent : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {hasTarget ? `Goal: ${formatNumber(target)} ${unit}` : "Set an active goal to track progress."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceBadge({ source }: { source: EntrySource }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-xs font-medium",
        source === "AI_IMAGE" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
      )}
    >
      {formatSource(source)}
    </span>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
