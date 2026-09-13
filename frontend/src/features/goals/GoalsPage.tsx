import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { createGoal, getActiveGoal, getGoalHistory, updateCurrentGoal } from "./goals.api";
import type { GoalFormValues, GoalPayload, NutritionGoal } from "./goal.types";

const emptyForm: GoalFormValues = {
  dailyCalories: "",
  proteinGrams: "",
  carbGrams: "",
  fatGrams: "",
  weightGoalKg: ""
};

const fields: Array<{
  name: keyof GoalFormValues;
  label: string;
  placeholder: string;
  suffix: string;
  optional?: boolean;
}> = [
  { name: "dailyCalories", label: "Daily calorie target", placeholder: "2200", suffix: "kcal" },
  { name: "proteinGrams", label: "Protein target", placeholder: "140", suffix: "g" },
  { name: "carbGrams", label: "Carb target", placeholder: "250", suffix: "g" },
  { name: "fatGrams", label: "Fat target", placeholder: "70", suffix: "g" },
  { name: "weightGoalKg", label: "Weight goal", placeholder: "72", suffix: "kg", optional: true }
];

function goalToForm(goal: NutritionGoal): GoalFormValues {
  return {
    dailyCalories: String(goal.dailyCalories),
    proteinGrams: String(goal.proteinGrams),
    carbGrams: String(goal.carbGrams),
    fatGrams: String(goal.fatGrams),
    weightGoalKg: goal.weightGoalKg === null ? "" : String(goal.weightGoalKg)
  };
}

function toPayload(form: GoalFormValues): GoalPayload {
  return {
    dailyCalories: Number(form.dailyCalories),
    proteinGrams: Number(form.proteinGrams),
    carbGrams: Number(form.carbGrams),
    fatGrams: Number(form.fatGrams),
    ...(form.weightGoalKg ? { weightGoalKg: Number(form.weightGoalKg) } : {})
  };
}

function matchesActiveGoal(payload: GoalPayload, activeGoal: NutritionGoal) {
  return (
    payload.dailyCalories === Number(activeGoal.dailyCalories) &&
    payload.proteinGrams === Number(activeGoal.proteinGrams) &&
    payload.carbGrams === Number(activeGoal.carbGrams) &&
    payload.fatGrams === Number(activeGoal.fatGrams) &&
    (payload.weightGoalKg ?? null) === (activeGoal.weightGoalKg === null ? null : Number(activeGoal.weightGoalKg))
  );
}

function formatNumber(value: string | number | null) {
  if (value === null || value === "") {
    return "-";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1
  });
}

export function GoalsPage() {
  const [activeGoal, setActiveGoal] = useState<NutritionGoal | null>(null);
  const [goalHistory, setGoalHistory] = useState<NutritionGoal[]>([]);
  const [form, setForm] = useState<GoalFormValues>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<"update" | "version" | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(activeGoal);

  const currentStats = useMemo(
    () => [
      { label: "Calories", value: formatNumber(activeGoal?.dailyCalories ?? null), unit: "kcal" },
      { label: "Protein", value: formatNumber(activeGoal?.proteinGrams ?? null), unit: "g" },
      { label: "Carbs", value: formatNumber(activeGoal?.carbGrams ?? null), unit: "g" },
      { label: "Fat", value: formatNumber(activeGoal?.fatGrams ?? null), unit: "g" }
    ],
    [activeGoal]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadGoals() {
      setIsLoading(true);
      setError("");

      try {
        const [currentResponse, historyResponse] = await Promise.all([getActiveGoal(), getGoalHistory()]);

        if (!isMounted) {
          return;
        }

        setActiveGoal(currentResponse.goal);
        setGoalHistory(historyResponse.goals);
        setForm(currentResponse.goal ? goalToForm(currentResponse.goal) : emptyForm);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load nutrition goals");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGoals();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveGoal(createVersion: boolean) {
    setError("");
    setSuccessMessage("");
    if (createVersion) {
      setIsCreatingVersion(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      const payload = toPayload(form);
      const response = createVersion || !isEditing ? await createGoal(payload) : await updateCurrentGoal(payload);
      const historyResponse = await getGoalHistory();

      setActiveGoal(response.goal);
      setGoalHistory(historyResponse.goals);
      setForm(goalToForm(response.goal));
      setSuccessMessage(
        createVersion
          ? "New goal version created. Your previous active goal was archived."
          : isEditing
            ? "Current goal updated successfully."
            : "Nutrition goal created successfully."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save nutrition goal");
    } finally {
      if (createVersion) {
        setIsCreatingVersion(false);
      } else {
        setIsSubmitting(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isEditing) {
      setConfirmationAction("update");
      return;
    }

    void saveGoal(false);
  }

  function handleCreateVersion() {
    setConfirmationAction("version");
  }

  function handleConfirmation() {
    if (confirmationAction === "version") {
      const payload = toPayload(form);
      setConfirmationAction(null);

      if (activeGoal && matchesActiveGoal(payload, activeGoal)) {
        setShowDuplicateWarning(true);
        return;
      }

      void saveGoal(true);
      return;
    }

    setConfirmationAction(null);
    void saveGoal(false);
  }

  function handleDuplicateConfirmation() {
    setShowDuplicateWarning(false);
    void saveGoal(true);
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="page-kicker">Plan with intent</p>
          <h1 className="page-title">Nutrition Goals</h1>
          <p className="page-description">
            Set one active daily target for calories, macros, and body-weight direction.
          </p>
        </div>
        {activeGoal ? (
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Active since {formatDate(activeGoal.createdAt)}
          </div>
        ) : null}
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

      {isLoading ? (
        <Card>
          <CardContent className="flex h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading nutrition goals...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {currentStats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{stat.label}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-semibold">{stat.value}</span>
                      <span className="pb-1 text-sm text-muted-foreground">{stat.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? "Edit Active Goal" : "Create Nutrition Goal"}</CardTitle>
                <CardDescription>
                  {isEditing
                    ? "Modify the current goal without creating a new history version."
                    : "Create your first active goal to unlock goal comparisons."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                  {fields.map((field) => (
                    <div className="space-y-2" key={field.name}>
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.optional ? <span className="text-muted-foreground"> optional</span> : null}
                      </Label>
                      <div className="relative">
                        <Input
                          className="pr-14"
                          id={field.name}
                          min={field.name === "dailyCalories" ? 1 : 0}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, [field.name]: event.target.value }))
                          }
                          placeholder={field.placeholder}
                          required={!field.optional}
                          step={field.name === "dailyCalories" ? 1 : 0.1}
                          type="number"
                          value={form[field.name]}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                          {field.suffix}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-4 sm:col-span-2">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-md border bg-background p-4">
                        <p className="text-sm font-medium">Update Goal</p>
                        <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                          Modify the current goal without creating a new history version.
                        </p>
                        <Button className="mt-4 w-full" disabled={isSubmitting || isCreatingVersion} type="submit">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : isEditing ? (
                            "Update Goal"
                          ) : (
                            "Create Goal"
                          )}
                        </Button>
                      </div>
                      <div className="rounded-md border bg-background p-4">
                        <p className="text-sm font-medium">Create New Goal Version</p>
                        <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                          Create a new active goal and preserve the previous goal in history.
                        </p>
                        <Button
                          className="mt-4 w-full"
                          disabled={!activeGoal || isSubmitting || isCreatingVersion}
                          onClick={handleCreateVersion}
                          type="button"
                          variant="outline"
                        >
                          {isCreatingVersion ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create New Goal Version"
                          )}
                        </Button>
                      </div>
                    </div>
                    {isEditing ? (
                      <Button
                        disabled={isSubmitting || isCreatingVersion}
                        onClick={() => activeGoal && setForm(goalToForm(activeGoal))}
                        type="button"
                        variant="ghost"
                      >
                        Reset changes
                      </Button>
                    ) : null}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Goal</CardTitle>
                <CardDescription>The active target used by reports and dashboard comparisons.</CardDescription>
              </CardHeader>
              <CardContent>
                {activeGoal ? (
                  <dl className="space-y-3 text-sm">
                    <GoalRow label="Daily calories" value={`${formatNumber(activeGoal.dailyCalories)} kcal`} />
                    <GoalRow label="Protein" value={`${formatNumber(activeGoal.proteinGrams)} g`} />
                    <GoalRow label="Carbs" value={`${formatNumber(activeGoal.carbGrams)} g`} />
                    <GoalRow label="Fat" value={`${formatNumber(activeGoal.fatGrams)} g`} />
                    <GoalRow label="Weight goal" value={`${formatNumber(activeGoal.weightGoalKg)} kg`} />
                  </dl>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center">
                    <Target className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">No active goal yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add your first target to start comparing planned vs actual nutrition.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <CardTitle>Goal History</CardTitle>
                <CardDescription>
                  Showing {goalHistory.length} goal version{goalHistory.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[420px] overflow-y-auto overscroll-contain scroll-smooth pr-3 [scrollbar-color:hsl(var(--border))_transparent] sm:max-h-[650px]">
                {goalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {goalHistory.map((goal) => (
                      <div className="rounded-md border p-3" key={goal.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">{formatNumber(goal.dailyCalories)} kcal</p>
                          </div>
                          <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
                            {goal.isActive ? "Active" : "Archived"}
                          </span>
                        </div>
                        <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          <HistoryDetail label="Protein" value={`${formatNumber(goal.proteinGrams)} g`} />
                          <HistoryDetail label="Carbs" value={`${formatNumber(goal.carbGrams)} g`} />
                          <HistoryDetail label="Fat" value={`${formatNumber(goal.fatGrams)} g`} />
                          <HistoryDetail label="Weight goal" value={`${formatNumber(goal.weightGoalKg)} kg`} />
                          <HistoryDetail label="Created" value={formatDate(goal.createdAt)} />
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Goal history will appear after you create a target.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationAction(null);
          }
        }}
        open={confirmationAction !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmationAction === "version" ? "Create New Goal Version" : "Update Current Goal"}
            </DialogTitle>
            <DialogDescription>
              {confirmationAction === "version"
                ? "This will create a new active goal and archive the current active goal in history."
                : "This will modify your current active goal without creating a new history version."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmationAction(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button onClick={handleConfirmation} type="button">
              {confirmationAction === "version" ? "Create Version" : "Update Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setShowDuplicateWarning(false);
          }
        }}
        open={showDuplicateWarning}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Goal Version</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {"The values entered are identical to your current active goal.\n\nCreating another version will not change any targets and may create unnecessary history records.\n\nDo you still want to create a new goal version?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDuplicateWarning(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDuplicateConfirmation} type="button">
              Create Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function HistoryDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
