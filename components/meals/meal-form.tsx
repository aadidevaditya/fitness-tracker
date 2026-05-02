import { saveMealLog } from "@/app/actions/meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MealDefinition = {
  slot_key: string;
  title: string;
};

type MealLog = {
  slot_key?: string | null;
  planned_kcal: number | null;
  planned_protein_g: number | null;
  actual_kcal: number | null;
  actual_protein_g: number | null;
  done_at: string | null;
};

type Props = {
  dateISO: string;
  definition: MealDefinition;
  log: MealLog | undefined;
};

export function MealSlotForm({ definition, dateISO, log }: Props) {
  const plannedCal = Math.max(log?.planned_kcal ?? 0, 50);
  const plannedProt = Math.max(log?.planned_protein_g ?? 8, 4);
  const actualCal = log?.actual_kcal ?? plannedCal;
  const actualProt = log?.actual_protein_g ?? plannedProt;
  const timestamp = `${definition.slot_key}-${plannedCal}`;

  return (
    <form
      action={saveMealLog}
      key={timestamp}
      className="rounded-2xl border border-neutral-900 bg-neutral-950/65 p-4 shadow-inner shadow-black/50"
    >
      <input type="hidden" name="log_date" value={dateISO} />
      <input type="hidden" name="slot_key" value={definition.slot_key} />
      <input type="hidden" name="planned_kcal" defaultValue={plannedCal} />
      <input type="hidden" name="planned_protein_g" defaultValue={plannedProt} />

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
              {definition.slot_key.replace(/_/g, " ")}
            </p>
            <h4 className="text-lg font-semibold text-neutral-50">
              {definition.title}
            </h4>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              name="done"
              value="true"
              defaultChecked={Boolean(log?.done_at)}
              className="size-5 rounded-md border-neutral-700 bg-neutral-950 accent-neutral-50"
            />
            Done
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`kcal-${definition.slot_key}`}>Calories</Label>
            <Input
              id={`kcal-${definition.slot_key}`}
              inputMode="numeric"
              required
              name="actual_kcal"
              defaultValue={actualCal}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`protein-${definition.slot_key}`}>Protein (g)</Label>
            <Input
              id={`protein-${definition.slot_key}`}
              inputMode="numeric"
              required
              name="actual_protein_g"
              defaultValue={actualProt}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="font-mono text-[13px] text-neutral-300">
            Targets ≈ {plannedCal} kcal · {plannedProt} g P
          </span>
          <Button type="submit" size="sm" variant="muted">
            Save bite
          </Button>
        </div>
      </div>
    </form>
  );
}
