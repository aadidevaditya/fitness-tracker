"use client";

import { Loader2, Save } from "lucide-react";
import { useMemo, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { saveSets } from "@/app/actions/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TemplateExercise = {
  split_key: string;
  exercise_slug: string;
  exercise_name: string;
  target_sets: number;
  target_reps_low: number;
  target_reps_high: number;
};

type StartingLoads = Record<string, number | string | null | undefined>;

type LoggedSet = {
  exercise_slug: string;
  exercise_name: string;
  reps: number;
  weight: number;
  set_index: number;
};

type Props = {
  sessionDate: string;
  splitKey: string;
  label: string;
  items: TemplateExercise[];
  startingLoads: StartingLoads;
  initialSets: LoggedSet[];
  defaultCompleted: boolean;
};

type Row = { reps: number; weight: number };

function baseRows(
  template: TemplateExercise,
  loads: StartingLoads,
  seed: Row[],
): Row[] {
  const load = Number(loads?.[template.exercise_slug] ?? 0);
  const midReps = Math.round(
    (template.target_reps_low + template.target_reps_high) / 2,
  );
  const count = Math.max(template.target_sets, seed.length || 1, 1);

  return Array.from({ length: count }).map((_, idx) => {
    const existing = seed[idx];
    return {
      reps: existing?.reps ?? midReps,
      weight:
        typeof existing?.weight === "number" && Number.isFinite(existing.weight)
          ? existing.weight
          : Number.isFinite(load)
            ? load
            : 0,
    };
  });
}

export function SessionBoard({
  items,
  splitKey,
  label,
  startingLoads,
  sessionDate,
  initialSets,
  defaultCompleted,
}: Props) {
  const [pending, startTransition] = useTransition();

  const rowsByExercise = useMemo(() => {
    return items.map((template) => {
      const seed = initialSets
        .filter((log) => log.exercise_slug === template.exercise_slug)
        .sort((a, b) => a.set_index - b.set_index)
        .map((log) => ({
          reps: log.reps,
          weight: Number(log.weight),
        }));

      return {
        template,
        rows: baseRows(template, startingLoads, seed),
      };
    });
  }, [initialSets, items, startingLoads]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = rowsByExercise.map(({ template, rows }) => {
      const built: Row[] = [];
      for (let idx = 0; idx < rows.length; idx += 1) {
        const reps = Number(
          formData.get(`${template.exercise_slug}-reps-${idx}`),
        );
        const weight = Number(
          formData.get(`${template.exercise_slug}-weight-${idx}`),
        );
        built.push({
          reps: Number.isFinite(reps) ? reps : template.target_reps_low,
          weight: Number.isFinite(weight) ? weight : 0,
        });
      }

      return {
        exercise_slug: template.exercise_slug,
        exercise_name: template.exercise_name,
        rows: built,
      };
    });

    formData.set("sets", JSON.stringify(payload));
    formData.set("session_date", sessionDate);
    formData.set("split_key", splitKey);

    startTransition(async () => {
      const result = await saveSets(formData);
      if (result?.ok) {
        toast.success("Session committed.");
      } else {
        toast.error("Could not save session.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <input type="hidden" name="session_date" value={sessionDate} readOnly />
      <input type="hidden" name="split_key" value={splitKey} readOnly />

      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-900 bg-neutral-950 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
          Today&apos;s block
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-50">{label}</h2>
            <p className="text-sm text-neutral-400">{splitKey.toUpperCase()}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-200">
            <input
              type="checkbox"
              name="completed"
              value="true"
              defaultChecked={defaultCompleted}
              className="size-5 rounded-md border-neutral-700 bg-neutral-950 accent-neutral-50"
            />
            Mark lift complete
          </label>
        </div>
      </div>

      {rowsByExercise.map(({ template, rows }) => (
        <div
          key={template.exercise_slug}
          className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 shadow-inner shadow-black/40"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                {rows.length} working sets • {template.target_reps_low}–
                {template.target_reps_high} reps
              </p>
              <h3 className="text-xl font-semibold">{template.exercise_name}</h3>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={`${template.exercise_slug}-${idx}`}
                className="grid grid-cols-2 gap-3 rounded-xl bg-neutral-900/70 p-3 sm:grid-cols-[80px_repeat(2,minmax(0,1fr))]"
              >
                <div className="hidden sm:flex sm:flex-col sm:justify-end">
                  <span className="text-xs uppercase text-neutral-500">Set</span>
                  <p className="text-lg font-semibold text-neutral-100">
                    #{idx + 1}
                  </p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-neutral-500">
                    Reps
                  </Label>
                  <Input
                    className="mt-2"
                    name={`${template.exercise_slug}-reps-${idx}`}
                    defaultValue={row.reps}
                    inputMode="numeric"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase text-neutral-500">
                    Weight (kg)
                  </Label>
                  <Input
                    className="mt-2"
                    name={`${template.exercise_slug}-weight-${idx}`}
                    defaultValue={Number.isFinite(row.weight) ? row.weight : ""}
                    inputMode="decimal"
                    step="0.25"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Progress rule: chase +2.5 kg/week or sneak +1 crushing rep once technique
            is locked in.
          </p>
        </div>
      ))}

      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-6 text-neutral-950"
      >
        {pending ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Saving
          </>
        ) : (
          <>
            <Save className="size-5" aria-hidden />
            Save session & sets
          </>
        )}
      </Button>
    </form>
  );
}
