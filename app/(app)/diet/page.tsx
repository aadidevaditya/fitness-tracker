import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export default async function DietPage() {
  const { supabase, user } = await requireUser();

  const [{ data: defs }, settings] = await Promise.all([
    supabase
      .from("meal_definitions")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const s = settings.data;

  if (!s) {
    return (
      <p className="text-sm text-neutral-400">
        User settings missing. Sign out/in after applying Supabase migrations.
      </p>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.38em] text-neutral-400">
          Nutrition doctrine
        </p>
        <h1 className="text-3xl font-semibold text-neutral-50">Diet map</h1>
        <p className="text-sm text-neutral-400">
          Vegetarian lean bulk · office cadence anchored around 10-6 with training at
          6pm weekdays.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Macro envelope</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-neutral-300 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-neutral-500">Calories</p>
            <p className="text-2xl font-semibold text-neutral-50">
              {s?.calorie_min ?? 2700}–{s?.calorie_max ?? 2800}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-500">Protein</p>
            <p className="text-2xl font-semibold text-neutral-50">
              {s?.protein_min_g ?? 120}–{s?.protein_max_g ?? 130} g/day
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-500">Template</p>
            <p className="text-lg font-semibold text-neutral-50">
              {defs?.length ?? 0} anchored meals
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-900">
        <CardHeader>
          <CardTitle>Schedule anchors</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-neutral-300 md:grid-cols-2">
          <Bullet title="Office" body={s?.office_hours ?? "10 AM – 6 PM"} />
          <Bullet title="Gym weekdays" body={s?.gym_hours ?? "6 PM – 7 PM"} />
          <Bullet title="Dinner bell" body={s?.dinner_hours ?? "~9 PM"} />
          <Bullet title="Weekend play" body={s?.weekend_hours ?? "Sports block"} />
        </CardContent>
      </Card>

      {s?.low_bloating_mode ? (
        <Card className="border-amber-500/60 bg-gradient-to-br from-neutral-950 to-neutral-900">
          <CardHeader>
            <CardTitle className="text-amber-100">Low-bloat mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-50/85">
            <p>Quiet the gut lining while surplus stays pinned.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>No raw full-cream milk shakes—prefer toned dairy or strained curd.</li>
              <li>Hold seeds/flax until digestion reports stay “normal.”</li>
              <li>Keep sodium steady; spike water strategically around training heat.</li>
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {(defs ?? []).map((meal) => (
          <Card key={meal.slot_key}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                    {meal.slot_key.replace(/_/g, " ")}
                  </p>
                  <CardTitle>{meal.title}</CardTitle>
                </div>
                <p className="text-xs font-mono text-neutral-500">
                  {meal.default_kcal} kcal · {meal.default_protein_g} g P +/-
                </p>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-neutral-300">
              {meal.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">{title}</p>
      <p className="mt-3 text-neutral-50">{body}</p>
    </div>
  );
}
