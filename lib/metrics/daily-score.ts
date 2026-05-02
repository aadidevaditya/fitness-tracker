/** Returns 0‑1 fractional score blending meals + planned sessions. */

export type DailyComplianceInput = {
  mealDone: number;
  mealTotal: number;
  expectsWorkout: boolean;
  workoutCompleted?: boolean | null;
};

export function calculateDailyCompliance({
  mealDone,
  mealTotal,
  expectsWorkout,
  workoutCompleted,
}: DailyComplianceInput): number {
  const mealFrac = mealTotal === 0 ? 0 : mealDone / mealTotal;

  if (!expectsWorkout) {
    return Math.min(100, mealFrac * 100);
  }

  const liftFrac = workoutCompleted ? 1 : 0;

  const blended = mealFrac * 0.72 + liftFrac * 0.28;
  return Math.min(100, Math.round(blended * 1000) / 10);
}
