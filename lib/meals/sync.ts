import type { SupabaseClient } from "@supabase/supabase-js";

/** Ensure each meal slot exists for log_date based on definitions. */
export async function syncMealsForDay(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
) {
  const { data: definitions, error: defError } = await supabase
    .from("meal_definitions")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (defError) throw defError;
  if (!definitions?.length) return;

  const { data: existing, error: logError } = await supabase
    .from("meal_logs")
    .select("slot_key")
    .eq("user_id", userId)
    .eq("log_date", logDate);

  if (logError) throw logError;

  const slots = new Set(existing?.map((row) => row.slot_key));

  const rows = definitions
    .filter((def) => !slots.has(def.slot_key))
    .map((def) => ({
      user_id: userId,
      log_date: logDate,
      slot_key: def.slot_key,
      planned_kcal: def.default_kcal,
      planned_protein_g: def.default_protein_g,
      actual_kcal: def.default_kcal,
      actual_protein_g: def.default_protein_g,
      done_at: null as string | null,
    }));

  if (!rows.length) return;

  const { error } = await supabase.from("meal_logs").upsert(rows, {
    onConflict: "user_id,log_date,slot_key",
  });

  if (error) throw error;
}
