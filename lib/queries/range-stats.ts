import { eachDayOfInterval, format, subDays } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateDailyCompliance } from "@/lib/metrics/daily-score";

/** Utility for dashboards & progress charts spanning N days anchored on `anchor`. */

export async function buildRollingSeries(params: {
  supabase: SupabaseClient;
  userId: string;
  anchor: Date;
  span: number;
}) {
  const endDay = params.anchor;
  const startDay = subDays(endDay, Math.max(params.span - 1, 0));

  const isoRange = eachDayOfInterval({ start: startDay, end: endDay }).map(
    (day) => format(day, "yyyy-MM-dd"),
  );

  const [{ data: schedule }, slotQuery, snapsRes, mealsRes, workoutsRes] =
    await Promise.all([
      params.supabase
        .from("workout_schedule")
        .select("dow,is_rest,split_key")
        .eq("user_id", params.userId),
      params.supabase
        .from("meal_definitions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", params.userId),
      params.supabase
        .from("daily_snapshots")
        .select("snapshot_date,weight_kg,digestion")
        .eq("user_id", params.userId)
        .in("snapshot_date", isoRange),
      params.supabase
        .from("meal_logs")
        .select("log_date,done_at")
        .eq("user_id", params.userId)
        .in("log_date", isoRange),
      params.supabase
        .from("workout_sessions")
        .select("session_date,completed,split_key")
        .eq("user_id", params.userId)
        .in("session_date", isoRange),
    ]);

  const slotTotal = Math.max(slotQuery.count ?? 7, 1);

  const weightSeries = isoRange.map((day) => {
    const snapshot = snapsRes.data?.find((row) => row.snapshot_date === day);
    return {
      date: day,
      kg: snapshot?.weight_kg ? Number(snapshot.weight_kg) : null,
    };
  });

  const workoutMap = new Map<
    string,
    { completed: boolean; split_key: string }
  >();
  workoutsRes.data?.forEach((row) =>
    workoutMap.set(row.session_date, row),
  );

  const complianceSeries = isoRange.map((day) => {
    const dow = new Date(`${day}T12:00:00`).getDay();
    const plan = schedule?.find((row) => row.dow === dow);
    const expectsWorkout =
      Boolean(plan) && !(plan?.is_rest || plan?.split_key === "rest");

    const mealsLogged = mealsRes.data ?? [];
    const mealsDoneCount = mealsLogged.filter(
      (row) => row.log_date === day && Boolean(row.done_at),
    ).length;

    const session = workoutMap.get(day);

    const score = calculateDailyCompliance({
      mealDone: mealsDoneCount,
      mealTotal: slotTotal,
      expectsWorkout,
      workoutCompleted:
        expectsWorkout && session ? session.completed ?? false : undefined,
    });

    return { date: day, score };
  });

  const digestionMarkers =
    snapsRes.data?.filter((snap) =>
      isoRange.includes(snap.snapshot_date ?? ""),
    ) ?? [];

  return {
    isoRange,
    weightSeries,
    complianceSeries,
    digestionMarkers,
  };
}
