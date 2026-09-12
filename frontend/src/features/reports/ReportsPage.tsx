import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGoalComparison, getMacroBreakdown, getWeeklyCalories } from "./reports.api";
import type { GoalComparisonPoint, MacroBreakdownPoint, WeeklyCaloriePoint } from "./report.types";

const macroColors: Record<MacroBreakdownPoint["key"], string> = {
  protein: "#059669",
  carbs: "#0284c7",
  fat: "#f59e0b"
};

function formatNumber(value: number, maximumFractionDigits = 1) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: toDateInputValue(monday),
    endDate: toDateInputValue(sunday),
    today: toDateInputValue(today)
  };
}

export function ReportsPage() {
  const defaultRange = useMemo(() => getCurrentWeekRange(), []);
  const [weeklyCalories, setWeeklyCalories] = useState<WeeklyCaloriePoint[]>([]);
  const [macroBreakdown, setMacroBreakdown] = useState<MacroBreakdownPoint[]>([]);
  const [goalComparison, setGoalComparison] = useState<GoalComparisonPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      setIsLoading(true);
      setError("");

      try {
        const [weeklyResponse, macroResponse, comparisonResponse] = await Promise.all([
          getWeeklyCalories(defaultRange.startDate, defaultRange.endDate),
          getMacroBreakdown(defaultRange.startDate, defaultRange.endDate),
          getGoalComparison(defaultRange.today)
        ]);

        if (!isMounted) {
          return;
        }

        setWeeklyCalories(weeklyResponse);
        setMacroBreakdown(macroResponse);
        setGoalComparison(comparisonResponse);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load reports");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [defaultRange]);

  const hasWeeklyCalories = weeklyCalories.some((item) => item.calories > 0);
  const hasMacroBreakdown = macroBreakdown.some((item) => item.value > 0);
  const hasGoalComparison = goalComparison.some((item) => item.goal > 0 || item.actual > 0);

  if (isLoading) {
    return <PageLoader label="Loading reports..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze weekly calories, macro distribution, and goal performance from real meal data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Calorie Trend</CardTitle>
          <CardDescription>Calories logged from Monday through Sunday.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasWeeklyCalories ? (
            <div className="h-80">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={weeklyCalories} margin={{ left: 8, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} />
                  <YAxis tickLine={false} width={56} />
                  <Tooltip
                    formatter={(value) => [`${formatNumber(Number(value), 0)} kcal`, "Calories"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                  />
                  <Line
                    activeDot={{ r: 6 }}
                    dataKey="calories"
                    dot={{ r: 4 }}
                    stroke="#059669"
                    strokeWidth={3}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              description="Log meals this week to see your calorie trend from Monday to Sunday."
              title="No weekly calorie data"
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Macronutrient Breakdown</CardTitle>
            <CardDescription>Total protein, carbs, and fat for the selected week.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasMacroBreakdown ? (
              <div className="h-80">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie data={macroBreakdown} dataKey="value" innerRadius={64} outerRadius={104} paddingAngle={3}>
                      {macroBreakdown.map((entry) => (
                        <Cell fill={macroColors[entry.key]} key={entry.key} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${formatNumber(Number(value))} g`, "Amount"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel
                description="Add meals with macro values to see how protein, carbs, and fat are distributed."
                title="No macro data yet"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal vs Actual</CardTitle>
            <CardDescription>Compares today's active goal with today's logged intake.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasGoalComparison ? (
              <div className="h-80">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={goalComparison} margin={{ left: 8, right: 16, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickLine={false} width={56} />
                    <Tooltip formatter={(value, name) => [formatNumber(Number(value), 0), name]} />
                    <Legend />
                    <Bar dataKey="goal" fill="#94a3b8" name="Goal" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="#059669" name="Actual" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel
                description="Set a nutrition goal and log meals today to compare planned vs actual intake."
                title="No comparison available"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
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
        <BarChart3 className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
