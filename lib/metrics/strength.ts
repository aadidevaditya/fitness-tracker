type BenchLift = {
  sessionDate: string;
  weightKg: number;
};

/**
 * Lightweight bench heuristic: regressing vs a prior plateau flags "strength stale".
 */
export function isBenchStrengthStale(liftsAsc: BenchLift[]): boolean {
  if (liftsAsc.length < 3) return false;

  const aggregated = rollupMaxByWeek(liftsAsc);
  const weeks = aggregated.sort((a, b) =>
    a.weekKey.localeCompare(b.weekKey),
  );

  const latestThree = weeks.slice(-3).map((w) => w.maxWeight);
  if (latestThree.length < 3) return false;

  const plateau = Math.max(...latestThree) - Math.min(...latestThree) < 2.75;
  const trendDown = latestThree[2] < latestThree[0] - 1.75;

  return plateau || trendDown;
}

function rollupMaxByWeek(entries: BenchLift[]) {
  const map = new Map<string, number>();

  for (const lift of entries) {
    const key = isoWeekFromDate(new Date(`${lift.sessionDate}T12:00:00`));
    const prev = map.get(key) ?? 0;
    if (lift.weightKg > prev) map.set(key, lift.weightKg);
  }

  return Array.from(map.entries()).map(([weekKey, maxWeight]) => ({
    weekKey,
    maxWeight,
  }));
}

function isoWeekFromDate(date: Date) {
  const target = new Date(date.valueOf());
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const isoYear = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const diff =
    Math.floor((target.valueOf() - firstThursday.valueOf()) / 86400000) / 7;
  const padded = String(Math.ceil(diff)).padStart(2, "0");
  return `${isoYear}-W${padded}`;
}
