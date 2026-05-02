import type { SupabaseClient } from "@supabase/supabase-js";

/** Creates a skeleton session for training days while leaving rest untouched. */
export async function ensureWorkoutSession(
  supabase: SupabaseClient,
  params: {
    userId: string;
    isoDate: string;
    dow: number;
  },
) {
  const { data: schedule, error } = await supabase
    .from("workout_schedule")
    .select("split_key, is_rest, label")
    .eq("user_id", params.userId)
    .eq("dow", params.dow)
    .maybeSingle();

  if (error) throw error;
  if (!schedule || schedule.is_rest || schedule.split_key === "rest") return;

  const existing = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", params.userId)
    .eq("session_date", params.isoDate)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return;

  const insert = await supabase.from("workout_sessions").insert({
    user_id: params.userId,
    session_date: params.isoDate,
    split_key: schedule.split_key,
    completed: false,
  });

  if (insert.error) throw insert.error;
}
