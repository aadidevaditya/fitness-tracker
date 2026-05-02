import { signOut } from "@/app/actions/auth";
import { updateSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings) {
    return (
      <p className="text-sm text-neutral-400">
        Settings row missing. Confirm Supabase trigger bootstrapped your account.
      </p>
    );
  }

  const loads = JSON.stringify(settings.exercise_starting_loads ?? {}, null, 2);

  return (
    <div className="space-y-8 pb-10">
      <header>
        <p className="text-xs uppercase tracking-[0.36em] text-neutral-400">
          Control room
        </p>
        <h1 className="text-3xl font-semibold text-neutral-50">Settings</h1>
        <p className="text-sm text-neutral-400">
          Calibrate targets, starting loads, and gut strategy. JSON stays strict—break it,
          the server rejects the save.
        </p>
      </header>

      <form action={updateSettings} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Body & phase</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field
              label="Current weight (kg)"
              name="current_weight_kg"
              defaultValue={settings.current_weight_kg}
            />
            <Field
              label="Target weight (kg)"
              name="target_weight_kg"
              defaultValue={settings.target_weight_kg}
            />
            <div className="md:col-span-2">
              <Label htmlFor="phase_label">Phase label</Label>
              <Input
                id="phase_label"
                name="phase_label"
                defaultValue={settings.phase_label}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nutrition envelope</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field
              label="Calorie floor"
              name="calorie_min"
              defaultValue={settings.calorie_min}
            />
            <Field
              label="Calorie ceiling"
              name="calorie_max"
              defaultValue={settings.calorie_max}
            />
            <Field
              label="Protein low (g)"
              name="protein_min_g"
              defaultValue={settings.protein_min_g}
            />
            <Field
              label="Protein high (g)"
              name="protein_max_g"
              defaultValue={settings.protein_max_g}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diet flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-neutral-300">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="vegetarian"
                value="on"
                defaultChecked={settings.vegetarian}
                className="size-5 rounded border-neutral-700 bg-neutral-950 accent-neutral-50"
              />
              Vegetarian template (paneer / legume forward)
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="low_bloating_mode"
                value="on"
                defaultChecked={settings.low_bloating_mode}
                className="size-5 rounded border-neutral-700 bg-neutral-950 accent-neutral-50"
              />
              Low-bloat mode (toned dairy, no seed roulette)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Starting loads (kg)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="exercise_loads">JSON map keyed by exercise slug</Label>
            <textarea
              id="exercise_loads"
              name="exercise_loads"
              defaultValue={loads}
              className="min-h-[220px] w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs text-neutral-100"
            />
            <p className="text-xs text-neutral-500">
              Example keys: bench_press, back_squat, lat_pulldown.
            </p>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" variant="muted">
          Save calibration
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-400">
          <p>Signed in as {user.email}</p>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string | number | null;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        step="any"
        required
        defaultValue={defaultValue ?? undefined}
        className="mt-2"
      />
    </div>
  );
}
