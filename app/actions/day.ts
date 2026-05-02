"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";

export async function updateDigestion(formData: FormData): Promise<void> {
  const schema = z.object({
    snapshot_date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
    digestion: z.enum(["normal", "gas", "bloating", "heavy"]),
    notes: z.string().optional().default(""),
  });

  const parsed = schema.safeParse({
    snapshot_date: formData.get("snapshot_date"),
    digestion: formData.get("digestion"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return;
  }

  const { supabase, user } = await requireUser();

  await supabase.from("daily_snapshots").upsert(
    {
      user_id: user.id,
      snapshot_date: parsed.data.snapshot_date,
      digestion: parsed.data.digestion,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,snapshot_date",
    },
  );

  revalidatePath("/today");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}

export async function updateMorningWeight(formData: FormData): Promise<void> {
  const schema = z.object({
    snapshot_date: z.string(),
    weight: z.coerce.number().positive(),
  });

  const parsed = schema.safeParse({
    snapshot_date: formData.get("snapshot_date"),
    weight: formData.get("weight"),
  });

  if (!parsed.success) return;

  const { supabase, user } = await requireUser();

  await supabase.from("daily_snapshots").upsert(
    {
      user_id: user.id,
      snapshot_date: parsed.data.snapshot_date,
      weight_kg: parsed.data.weight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,snapshot_date" },
  );

  await supabase
    .from("user_settings")
    .update({
      current_weight_kg: parsed.data.weight,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/progress");
}
