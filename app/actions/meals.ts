"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";

export async function saveMealLog(formData: FormData): Promise<void> {
  const parser = z.object({
    log_date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
    slot_key: z.string().min(1),
    planned_kcal: z.coerce.number().int(),
    planned_protein_g: z.coerce.number().int(),
  });

  const parsed = parser.safeParse({
    log_date: formData.get("log_date"),
    slot_key: formData.get("slot_key"),
    planned_kcal: formData.get("planned_kcal"),
    planned_protein_g: formData.get("planned_protein_g"),
  });

  if (!parsed.success) {
    return;
  }

  const readNumberOr = (entry: FormDataEntryValue | null, fallback: number) => {
    if (entry === null || entry === "") return fallback;
    const value = Number(entry);
    return Number.isFinite(value) ? value : fallback;
  };

  const { supabase, user } = await requireUser();
  const done = Boolean(formData.get("done"));
  const actualCal = Math.max(
    readNumberOr(formData.get("actual_kcal"), parsed.data.planned_kcal),
    35,
  );
  const actualProtein = Math.max(
    readNumberOr(formData.get("actual_protein_g"), parsed.data.planned_protein_g),
    5,
  );

  const { error } = await supabase.from("meal_logs").upsert(
    {
      user_id: user.id,
      log_date: parsed.data.log_date,
      slot_key: parsed.data.slot_key,
      planned_kcal: parsed.data.planned_kcal,
      planned_protein_g: parsed.data.planned_protein_g,
      actual_kcal: actualCal,
      actual_protein_g: actualProtein,
      done_at: done ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,log_date,slot_key" },
  );

  if (error) {
    return;
  }

  revalidatePath("/today");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}
