"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";

export async function updateSettings(formData: FormData): Promise<void> {
  const rawLoads = String(formData.get("exercise_loads") ?? "{}");

  let parsedLoads: unknown;
  try {
    parsedLoads = JSON.parse(rawLoads);
  } catch {
    return;
  }

  const loadRecord = z.record(z.string(), z.number());
  const loads = loadRecord.safeParse(parsedLoads);
  if (!loads.success) {
    return;
  }

  const numeric = z.coerce.number();
  const boolish = z
    .string()
    .optional()
    .transform((val) => val === "on");

  const parsed = z
    .object({
      current_weight_kg: numeric,
      target_weight_kg: numeric,
      calorie_min: z.coerce.number().int(),
      calorie_max: z.coerce.number().int(),
      protein_min_g: z.coerce.number().int(),
      protein_max_g: z.coerce.number().int(),
      phase_label: z.string().max(140),
      low_bloating_mode: boolish,
      vegetarian: boolish,
    })
    .safeParse({
      current_weight_kg: formData.get("current_weight_kg"),
      target_weight_kg: formData.get("target_weight_kg"),
      calorie_min: formData.get("calorie_min"),
      calorie_max: formData.get("calorie_max"),
      protein_min_g: formData.get("protein_min_g"),
      protein_max_g: formData.get("protein_max_g"),
      phase_label: formData.get("phase_label"),
      low_bloating_mode: formData.get("low_bloating_mode"),
      vegetarian: formData.get("vegetarian"),
    });

  if (!parsed.success) {
    return;
  }

  const { supabase, user } = await requireUser();

  await supabase
    .from("user_settings")
    .update({
      ...parsed.data,
      exercise_starting_loads: loads.data,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/workout");
}
