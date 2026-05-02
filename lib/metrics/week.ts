import { eachDayOfInterval, formatISO, parseISO } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import { deriveWeeklyAdvice, type WeeklySignals } from "@/lib/weekly-advice";
import { isBenchStrengthStale } from "@/lib/metrics/strength";

export async function summarizeRollingWeek(
  supabase: SupabaseClient,
  userId: string,
  anchorISO: string,
) {
  const anchor = parseISO(`${anchorISO}T12:00:00`);
  const days = eachDayOfInterval({
    start: new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      anchor.getDate() - 6,
    ),
    end: anchor,
  });
  const dayKeys = days.map((d) => formatISO(d, { representation: "date" }));

  const { data: schedule } = await supabase
    .from("workout_schedule")
    .select("dow, is_rest, split_key")
    .eq("user_id", userId);

  const [slotsRes, mealsRes] = await Promise.all([
    supabase
      .from("meal_definitions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("meal_logs")
      .select("slot_key, log_date, done_at")
      .eq("user_id", userId)
      .in("log_date", dayKeys),
  ]);

  const slotCount = slotsRes.count;
  const meals = mealsRes.data;

  const { data: snaps } = await supabase
    .from("daily_snapshots")
    .select("snapshot_date, weight_kg, waist_cm")
    .eq("user_id", userId)
    .in("snapshot_date", dayKeys)
    .order("snapshot_date", { ascending: true });

  const { data: workouts } = await supabase
    .from("workout_sessions")
    .select("session_date, completed, split_key")
    .eq("user_id", userId)
    .in("session_date", dayKeys);

  let expectedWorkouts = 0;
  let completedWorkouts = 0;
  dayKeys.forEach((key) => {
    const dow = new Date(`${key}T12:00:00`).getDay();

    const plan = schedule?.find((row) => row.dow === dow);
    if (!plan || plan.is_rest || plan.split_key === "rest") return;
    expectedWorkouts += 1;
    const match = workouts?.find((row) => row.session_date === key);
    if (match?.completed) completedWorkouts += 1;
  });

  const loggedMeals = meals?.filter((meal) => meal.done_at !== null) ?? [];

  const slotTotal = slotCount ?? 7;
  const theoreticalMeals = slotTotal * dayKeys.length;
  const mealsLoggedRows = meals?.length ?? 0;
  const dietCompliancePct =
    theoreticalMeals === 0
      ? 0
      : loggedMeals.length / Math.max(theoreticalMeals, mealsLoggedRows);

  const workoutCompliancePct =
    expectedWorkouts === 0
      ? 1
      : completedWorkouts / expectedWorkouts;

  const weighted = snaps?.filter((s) => s.weight_kg);
  const waisted = snaps?.filter((s) => typeof s.waist_cm === "number");

  const avgWeightKg =
    weighted && weighted.length
      ? weighted.reduce((sum, snap) => sum + Number(snap.weight_kg), 0) /
        weighted.length
      : null;

  const avgWaistCm =
    waisted && waisted.length
      ? waisted.reduce((sum, snap) => sum + Number(snap.waist_cm), 0) /
        waisted.length
      : null;

  const deltaWeightKg =
    weighted && weighted.length >= 3
      ? Number(weighted[weighted.length - 1].weight_kg ?? 0) -
        Number(weighted[0].weight_kg ?? 0)
      : null;

  const deltaWaistCm =
    waisted && waisted.length >= 3
      ? Number(waisted[waisted.length - 1].waist_cm ?? 0) -
        Number(waisted[0].waist_cm ?? 0)
      : null;

  const { data: benchRows } = await supabase
    .from("set_logs")
    .select("weight_kg, session_id")
    .eq("user_id", userId)
    .eq("exercise_slug", "bench_press")
    .order("created_at", { ascending: true });

  const benchStaging =
    benchRows?.map((row) => ({
      sessionId: row.session_id as string,
      weightKg: Number(row.weight_kg ?? 0),
    })) ?? [];

  let benchTrend: { sessionDate: string; weightKg: number }[] = [];

  if (benchStaging.length > 0) {
    const { data: sessRows } = await supabase
      .from("workout_sessions")
      .select("id, session_date")
      .eq("user_id", userId)
      .order("session_date", { ascending: true });

    const map = new Map<string, string>();
    sessRows?.forEach((s) => map.set(s.id, s.session_date));

    benchTrend = benchStaging
      .map((row) => ({
        sessionDate: map.get(row.sessionId) ?? "",
        weightKg: row.weightKg,
      }))
      .filter((row) => row.sessionDate.length > 0)
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  }

  const recentBench = benchTrend.filter((lift) =>
    dayKeys.includes(lift.sessionDate),
  );

  const strengthStale = recentBench.length >= 6
    ? isBenchStrengthStale(recentBench)
    : benchTrend.length >= 6
      ? isBenchStrengthStale(benchTrend.slice(-21))
      : false;

  const signals: WeeklySignals = {
    avgWeightKg,
    deltaWeightKg,
    deltaWaistCm,
    dietCompliancePct,
    workoutCompliancePct,
    strengthStale,
  };

  return {
    days: dayKeys,
    avgWeightKg,
    avgWaistCm,
    deltaWeightKg,
    deltaWaistCm,
    dietCompliancePct: Math.round(dietCompliancePct * 100),
    workoutCompliancePct: Math.round(workoutCompliancePct * 100),
    expectedWorkouts,
    completedWorkouts,
    advice: deriveWeeklyAdvice(signals),
  };
}
