import type { SupabaseClient } from "@supabase/supabase-js";

/** Top bench press load per logged session on/after sinceISO (yyyy-MM-dd). */
export async function fetchBenchPressSeries(
  supabase: SupabaseClient,
  userId: string,
  sinceISO: string,
) {
  const { data: sessions, error: sessError } = await supabase
    .from("workout_sessions")
    .select("id,session_date")
    .eq("user_id", userId)
    .gte("session_date", sinceISO);

  if (sessError) throw sessError;
  if (!sessions?.length) return [] as { date: string; kg: number }[];

  const sessionIds = sessions.map((row) => row.id);
  const dateMap = new Map<string, string>();
  sessions.forEach((row) => dateMap.set(row.id, row.session_date));

  const { data: lifts, error } = await supabase
    .from("set_logs")
    .select("weight_kg,session_id")
    .eq("user_id", userId)
    .eq("exercise_slug", "bench_press")
    .in("session_id", sessionIds);

  if (error) throw error;
  if (!lifts?.length) return [];

  const aggregates = new Map<string, number>();

  lifts.forEach((row) => {
    const day = dateMap.get(row.session_id);
    if (!day) return;
    const kg = Number(row.weight_kg ?? 0);
    const prev = aggregates.get(day) ?? 0;
    if (kg > prev) aggregates.set(day, kg);
  });

  return Array.from(aggregates.entries())
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
