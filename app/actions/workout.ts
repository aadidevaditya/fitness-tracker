"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";

export async function saveSets(formData: FormData) {
  const isoDate = z.string().parse(formData.get("session_date"));
  const splitKey = z.string().parse(formData.get("split_key"));

  let entriesRaw: unknown;

  try {
    entriesRaw = JSON.parse(z.string().parse(formData.get("sets")));
  } catch {
    return { ok: false as const, error: "Invalid sets payload" };
  }

  const setSchema = z.array(
    z.object({
      exercise_slug: z.string(),
      exercise_name: z.string(),
      rows: z.array(
        z.object({
          reps: z.coerce.number().int(),
          weight: z.coerce.number(),
        }),
      ),
    }),
  );

  const entries = setSchema.safeParse(entriesRaw);
  if (!entries.success) return { ok: false as const, error: "Malformed sets" };

  const { supabase, user } = await requireUser();

  const sessionQuery = await supabase
    .from("workout_sessions")
    .select("id,split_key")
    .eq("user_id", user.id)
    .eq("session_date", isoDate)
    .maybeSingle();

  let sessionId = sessionQuery.data?.id;

  if (!sessionId) {
    const inserted = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        session_date: isoDate,
        split_key: splitKey,
        completed: false,
      })
      .select("id")
      .maybeSingle();

    if (inserted.error || !inserted.data?.id) {
      return { ok: false as const, error: "Unable to open session" };
    }

    sessionId = inserted.data.id;
  }

  await supabase.from("set_logs").delete().eq("session_id", sessionId);

  const rows = entries.data.flatMap((exercise) =>
    exercise.rows.map((row, idx) => ({
      user_id: user.id,
      session_id: sessionId as string,
      exercise_slug: exercise.exercise_slug,
      exercise_name: exercise.exercise_name,
      set_index: idx,
      reps: row.reps,
      weight_kg: row.weight,
    })),
  );

  if (rows.length) {
    const { error } = await supabase.from("set_logs").insert(rows);
    if (error) return { ok: false as const, error };
  }

  const completedFlag = Boolean(formData.get("completed"));

  await supabase
    .from("workout_sessions")
    .update({ completed: completedFlag, split_key: splitKey })
    .eq("id", sessionId as string);

  revalidatePath("/workout");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { ok: true as const };
}
