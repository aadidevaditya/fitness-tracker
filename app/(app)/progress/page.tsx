import { parseISO } from "date-fns";

import { TrendBoard } from "@/components/progress/trend-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchBenchPressSeries } from "@/lib/queries/bench-series";
import { buildRollingSeries } from "@/lib/queries/range-stats";
import { requireUser } from "@/lib/auth/session";
import { utcTodayString } from "@/lib/dates";
import { summarizeRollingWeek } from "@/lib/metrics/week";

export default async function ProgressPage() {
  const { supabase, user } = await requireUser();
  const today = utcTodayString();
  const anchor = parseISO(`${today}T12:00:00`);

  const rolling = await buildRollingSeries({
    supabase,
    userId: user.id,
    anchor,
    span: 35,
  });

  const rangeStart =
    rolling.isoRange[0] ?? today;

  const [benchSeries, weekly] = await Promise.all([
    fetchBenchPressSeries(supabase, user.id, rangeStart),
    summarizeRollingWeek(supabase, user.id, today),
  ]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.36em] text-neutral-400">
          Signal extraction
        </p>
        <h1 className="text-3xl font-semibold text-neutral-50">Progress optics</h1>
        <p className="text-sm text-neutral-400">
          Weight trajectory, disciplined fueling, bench proxy. Pair with Weekly desk on Hub.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Weekly snapshot ({weekly.completedWorkouts} lifts banked)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm text-neutral-300 md:grid-cols-2">
          <div className="space-y-4">
            <Stat label="Δ Weight (rolling 7)">
              {formatDeltaKg(weekly.deltaWeightKg)}
            </Stat>
            <Stat label="Δ Waist (rolling 7)">
              {formatDeltaCm(weekly.deltaWaistCm)}
            </Stat>
            <Stat label="Fuel integrity">
              {weekly.dietCompliancePct}%
            </Stat>
            <Stat label="Lift integrity">
              {weekly.workoutCompliancePct}%
            </Stat>
          </div>
          <div className="rounded-3xl border border-neutral-900 bg-neutral-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.32em] text-neutral-400">
              Advisory
            </p>
            <p className="mt-4 text-lg font-semibold text-neutral-50">
              {weekly.advice.headline}
            </p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-300">
              {weekly.advice.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <TrendBoard
        weightSeries={rolling.weightSeries}
        complianceSeries={rolling.complianceSeries}
        benchSeries={benchSeries}
      />
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
      <span className="text-neutral-400">{label}</span>
      <span className="font-mono text-[15px] text-neutral-50">{children}</span>
    </div>
  );
}

function formatDeltaKg(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} kg`;
}

function formatDeltaCm(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} cm`;
}
