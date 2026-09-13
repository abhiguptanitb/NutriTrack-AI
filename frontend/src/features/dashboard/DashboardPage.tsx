import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Target, Utensils } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MealType } from "@/features/meals/meal.types";
import { getDashboardSummary } from "./dashboard.api";
import type { DashboardSummary } from "./dashboard.types";
import { formatDateTime } from "@/lib/utils";

const macroCards = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" }
] as const;

const mealLabels: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACKS: "Snacks"
};

const mealColors: Record<MealType, string> = {
  BREAKFAST: "#059669",
  LUNCH: "#0284c7",
  DINNER: "#7c3aed",
  SNACKS: "#f59e0b"
};

function formatNumber(value: number, maximumFractionDigits = 1) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getDashboardSummary();
        if (isMounted) {
          setSummary(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load dashboard");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const mealChartData = useMemo(
    () =>
      summary?.mealBreakdown.map((item) => ({
        name: mealLabels[item.mealType],
        value: item.calories,
        color: mealColors[item.mealType]
      })) ?? [],
    [summary]
  );

  if (isLoading) {
    return <PageLoader label="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!summary) {
    return <ErrorState message="Dashboard data is unavailable." />;
  }

  const hasMealsToday = summary.mealBreakdown.some((item) => item.calories > 0);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="page-kicker">Today at a glance</p>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            Today's nutrition progress, recent meals, and meal distribution.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4 text-primary" />
          {summary.goal ? "Active goal connected" : "No active goal set"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {macroCards.map((card) => {
          const consumed = summary.consumed[card.key];
          const target = summary.targets[card.key];
          const percent = summary.progress[card.key];

          return (
            <ProgressCard
              key={card.key}
              label={card.label}
              percent={percent}
              target={target}
              unit={card.unit}
              value={consumed}
            />
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Goal Progress Overview</CardTitle>
            <CardDescription>How today's intake compares with your active nutrition goal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {macroCards.map((card) => (
              <div key={card.key}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{card.label}</span>
                  <span className="text-muted-foreground">{summary.progress[card.key]}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(summary.progress[card.key], 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meal Distribution Summary</CardTitle>
            <CardDescription>Calories consumed today by meal type.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasMealsToday ? (
              <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie data={mealChartData} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={3}>
                      {mealChartData.map((entry) => (
                        <Cell fill={entry.color} key={entry.name} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${formatNumber(Number(value), 0)} kcal`, "Calories"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel
                description="Log a meal to see calorie distribution across breakfast, lunch, dinner, and snacks."
                title="No meals logged today"
              />
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {summary.mealBreakdown.map((item) => (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm" key={item.mealType}>
                  <span className="text-muted-foreground">{mealLabels[item.mealType]}</span>
                  <span className="font-medium">{formatNumber(item.calories, 0)} kcal</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Meals</CardTitle>
          <CardDescription>Your latest five food entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.recentMeals.length > 0 ? (
            <div className="divide-y rounded-md border">
              {summary.recentMeals.map((meal) => (
                <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center" key={meal.id}>
                  <div>
                    <p className="font-medium">{meal.foodName}</p>
                    <p className="text-sm text-muted-foreground">
                      {mealLabels[meal.mealType]} - {formatDateTime(meal.entryDate)}
                    </p>
                  </div>
                  <div className="text-sm font-medium">{formatNumber(meal.calories, 0)} kcal</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              description="Your latest food entries will appear here once you start logging meals."
              title="No recent meals yet"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressCard({
  label,
  percent,
  target,
  unit,
  value
}: {
  label: string;
  percent: number;
  target: number;
  unit: string;
  value: number;
}) {
  const cappedPercent = Math.min(percent, 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
            {target ? `${percent}%` : "No goal"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-semibold">{formatNumber(value, unit === "kcal" ? 0 : 1)}</span>
          <span className="pb-1 text-sm text-muted-foreground">{unit}</span>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${target ? cappedPercent : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Goal: {target ? `${formatNumber(target, unit === "kcal" ? 0 : 1)} ${unit}` : "Not set"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex h-96 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-secondary/40 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm">
        <Utensils className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
