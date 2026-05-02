import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { utcTodayString } from "@/lib/dates";
import { syncMealsForDay } from "@/lib/meals/sync";
import { calculateDailyCompliance } from "@/lib/metrics/daily-score";
import { summarizeRollingWeek } from "@/lib/metrics/week";
import { ensureWorkoutSession } from "@/lib/workouts/sync";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const today = utcTodayString();
  const dow = new Date(`${today}T12:00:00`).getDay();

  await syncMealsForDay(supabase, user.id, today);
  await ensureWorkoutSession(supabase, {
    userId: user.id,
    isoDate: today,
    dow,
  });

  const [
    settingsRes,
    mealsRes,
    snapshotRes,
    scheduleRes,
    sessionRes,
    weekly,
  ] = await Promise.all([
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .order("slot_key"),
    supabase
      .from("daily_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .eq("snapshot_date", today)
      .maybeSingle(),
    supabase
      .from("workout_schedule")
      .select("*")
      .eq("user_id", user.id)
      .eq("dow", dow)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_date", today)
      .maybeSingle(),
    summarizeRollingWeek(supabase, user.id, today),
  ]);

  const settings = settingsRes.data;

  const slotTotal =
    (
      await supabase
        .from("meal_definitions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
    ).count ?? 7;

  const meals = mealsRes.data ?? [];

  const actualCalories = meals.reduce(
    (sum, meal) => sum + Number(meal.actual_kcal ?? 0),
    0,
  );
  const actualProtein = meals.reduce(
    (sum, meal) => sum + Number(meal.actual_protein_g ?? 0),
    0,
  );

  const mealsDoneCount = meals.filter((meal) => Boolean(meal.done_at)).length;
  const plan = scheduleRes.data;

  const expectsWorkout =
    Boolean(plan) && !(plan?.is_rest || plan?.split_key === "rest");
  const workoutSession = sessionRes.data;

  const dailyScore = calculateDailyCompliance({
    mealDone: mealsDoneCount,
    mealTotal: Math.max(slotTotal, 7),
    expectsWorkout,
    workoutCompleted: expectsWorkout
      ? workoutSession?.completed ?? false
      : undefined,
  });

  const targetCalorieLow = settings?.calorie_min ?? 2700;
  const targetCalorieHigh = settings?.calorie_max ?? 2800;
  const proteinLow = settings?.protein_min_g ?? 120;
  const proteinHigh = settings?.protein_max_g ?? 130;
  const snapshotWeight = snapshotRes.data?.weight_kg
    ? Number(snapshotRes.data.weight_kg)
    : Number(settings?.current_weight_kg ?? 0);

  const mealProgress =
    Math.min(100, Math.round((actualCalories / targetCalorieLow) * 100)) ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.38em] text-neutral-400">
          {settings?.phase_label ?? "Lean gain phase"}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-50">
              Tactical overview
            </h1>
            <p className="text-sm text-neutral-400">{today}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.32em] text-neutral-400">
              Target mass
            </p>
            <p className="text-4xl font-semibold text-neutral-50">
              {settings?.target_weight_kg ?? 68}
              <span className="ml-2 text-base text-neutral-500">kg</span>
            </p>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s fuel & execution</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricBlock
            label="Calories in"
            value={`${actualCalories.toLocaleString()} kcal`}
            hint={`Band ${targetCalorieLow}-${targetCalorieHigh} kcal`}
            progress={`${mealProgress}% of lower band`}
          />
          <MetricBlock
            label="Protein pulse"
            value={`${actualProtein} g`}
            hint={`Shoot ${proteinLow}-${proteinHigh} g`}
          />
          <MetricBlock
            label="Compliance score"
            value={`${dailyScore.toFixed(0)} / 100`}
            hint={`${mealsDoneCount}/${slotTotal} bites confirmed`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs uppercase tracking-[0.32em] text-neutral-400">
              Scale cue
            </p>
            <CardTitle>Morning weigh-in</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-neutral-50">
              {snapshotWeight.toFixed(1)}
              <span className="ml-2 text-base text-neutral-500">kg</span>
            </p>
            <p className="mt-4 text-xs text-neutral-500">
              Log inside Today · rolling averages punish lazy entries.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="space-y-1">
            <p className="text-xs uppercase tracking-[0.32em] text-neutral-400">
              Training window
            </p>
            <CardTitle>Gym contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-300">
            <p className="text-lg font-semibold text-neutral-50">
              {plan?.label ?? "Day not scheduled"}
            </p>
            <p>
              {expectsWorkout
                ? workoutSession?.completed
                  ? "Lift locked in. Recovery food is now the job."
                  : "Session still open—log sets before bed."
                : "Recovery day · double down on food quality + digestion cues."}
            </p>
            <div className="flex gap-3">
              <Button asChild variant="muted" size="sm">
                <Link href="/today">Log fuel</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/workout">Lift view</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly decision desk</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2 text-sm text-neutral-400">
            <Row label="Average weight">
              <span>{weekly.avgWeightKg?.toFixed(2) ?? "—"} kg</span>
            </Row>
            <Row label="7-day Δ weight">
              <span>{formatDeltaKg(weekly.deltaWeightKg)}</span>
            </Row>
            <Row label="7-day Δ waist">
              <span>{formatDeltaCm(weekly.deltaWaistCm)}</span>
            </Row>
            <Row label="Diet completion">
              <span>{weekly.dietCompliancePct}%</span>
            </Row>
            <Row label="Lift completion">
              <span>{weekly.workoutCompliancePct}%</span>
            </Row>
          </div>
          <div className="rounded-3xl border border-neutral-900 bg-neutral-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.32em] text-neutral-400">
              Advisory
            </p>
            <p className="mt-4 text-xl font-semibold text-neutral-50">
              {weekly.advice.headline}
            </p>
            <ul className="mt-5 space-y-3 text-sm text-neutral-300">
              {weekly.advice.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full" variant="outline">
              <Link href="/progress">Open graphs</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {settings?.low_bloating_mode ? (
        <Card className="border-neutral-800 bg-neutral-900/40">
          <CardHeader>
            <CardTitle>Low-bloat mode</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-300">
            <ul className="list-disc space-y-2 pl-5">
              <li>Swap full-cream milk for toned milk or thick curd.</li>
              <li>Pull seeds + heavy roughage until digestion steadies.</li>
              <li>Track gut feel every night (Today page).</li>
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function MetricBlock({
  label,
  value,
  hint,
  progress,
}: {
  label: string;
  value: string;
  hint: string;
  progress?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-neutral-50">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{hint}</p>
      {progress ? (
        <p className="mt-2 text-xs text-neutral-500">{progress}</p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-900 pb-2 text-neutral-200">
      <span>{label}</span>
      <span className="font-mono text-[15px] text-neutral-100">{children}</span>
    </div>
  );
}

function formatDeltaKg(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} kg`;
}

function formatDeltaCm(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} cm`;
}
