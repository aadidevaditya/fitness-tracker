import { MealSlotForm } from "@/components/meals/meal-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDigestion, updateMorningWeight } from "@/app/actions/day";
import { requireUser } from "@/lib/auth/session";
import { utcTodayString } from "@/lib/dates";
import { syncMealsForDay } from "@/lib/meals/sync";

export default async function TodayPage() {
  const { supabase, user } = await requireUser();
  const today = utcTodayString();

  await syncMealsForDay(supabase, user.id, today);

  const [{ data: definitions }, { data: meals }, { data: snapshot }, settings] =
    await Promise.all([
      supabase
        .from("meal_definitions")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", today),
      supabase
        .from("daily_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .eq("snapshot_date", today)
        .maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

  const mealMap = new Map((meals ?? []).map((row) => [row.slot_key, row]));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.36em] text-neutral-400">
          Daily execution
        </p>
        <h1 className="text-3xl font-semibold text-neutral-50">
          Today · {today}
        </h1>
        <p className="text-sm text-neutral-400">
          Lock in every eating window. Small wins snowball into weekly averages.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Morning weight</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateMorningWeight} className="space-y-3">
              <input type="hidden" name="snapshot_date" value={today} />
              <div className="space-y-2">
                <Label htmlFor="weight">Scale read (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  step="0.05"
                  min="40"
                  max="120"
                  required
                  defaultValue={
                    snapshot?.weight_kg?.toString() ??
                    settings.data?.current_weight_kg?.toString() ??
                    "62.6"
                  }
                />
              </div>
              <Button type="submit" className="w-full" variant="muted">
                Save weigh-in
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Digestion radar</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateDigestion} className="space-y-3">
              <input type="hidden" name="snapshot_date" value={today} />
              <div className="space-y-2">
                <Label htmlFor="digestion">How did the gut feel?</Label>
                <select
                  id="digestion"
                  name="digestion"
                  defaultValue={snapshot?.digestion ?? "normal"}
                  className="h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100"
                >
                  <option value="normal">Normal</option>
                  <option value="gas">Gas</option>
                  <option value="bloating">Bloating</option>
                  <option value="heavy">Heavy / sluggish</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={snapshot?.notes ?? ""}
                  className="min-h-[90px] w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                  placeholder="Meal timing, stress, sleep…"
                />
              </div>
              <Button type="submit" className="w-full" variant="outline">
                Capture digestion signal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Fuel timeline</h2>
          <p className="text-sm text-neutral-400">
            Tap done when the meal landed. Macros stay editable for honesty.
          </p>
        </div>
        <div className="space-y-4">
          {(definitions ?? []).map((definition) => (
            <div key={definition.slot_key}>
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-neutral-600">
                {definition.description}
              </p>
              <MealSlotForm
                definition={definition}
                dateISO={today}
                log={
                  mealMap.get(definition.slot_key)
                    ? {
                        slot_key: definition.slot_key,
                        planned_kcal: mealMap.get(definition.slot_key)!.planned_kcal,
                        planned_protein_g:
                          mealMap.get(definition.slot_key)!.planned_protein_g,
                        actual_kcal: mealMap.get(definition.slot_key)!.actual_kcal,
                        actual_protein_g:
                          mealMap.get(definition.slot_key)!.actual_protein_g,
                        done_at: mealMap.get(definition.slot_key)!.done_at ?? null,
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
