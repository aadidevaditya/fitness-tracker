export type WeeklySignals = {
  avgWeightKg: number | null;
  deltaWeightKg: number | null;
  deltaWaistCm: number | null;
  dietCompliancePct: number;
  workoutCompliancePct: number;
  strengthStale: boolean;
};

export type WeeklyAdvice = {
  headline: string;
  bullets: string[];
};

/** Heuristic advisor for weekly check-ins (not medical advice). */
export function deriveWeeklyAdvice(signals: WeeklySignals): WeeklyAdvice {
  const bullets: string[] = [];
  let headline =
    "Logs look steady. Maintain current nutrition and repeat key lifts consistently.";

  if (signals.deltaWeightKg !== null) {
    if (signals.deltaWeightKg < 0.3) {
      headline = "Weekly gain trend is light — prioritize a controlled bump in calories.";
      bullets.push(
        "Increase intake by roughly 150–200 kcal on training days via carbs or whey.",
        "Keep protein anchored at ≥120–130 g and tighten sleep timing.",
      );
    }

    if (signals.deltaWeightKg > 0.8) {
      if (signals.deltaWaistCm !== null && signals.deltaWaistCm > 0.6) {
        headline =
          "Scale weight moved quickly and waist reacted — shave energy slightly.";
        bullets.push(
          "Trim roughly 150 kcal/day for a few days—mostly from discretionary fats.",
          "Front-load carbs around training windows; keep protein spread across meals.",
          "Maintain daily steps so water retention does not disguise the waist trend.",
        );
      } else if (signals.dietCompliancePct < 0.72) {
        bullets.push(
          "Scale jump may partly be logging misses—capture every meal accurately for a clearer signal.",
        );
      }
    }
  }

  if (signals.strengthStale) {
    const slowGain =
      signals.deltaWeightKg !== null &&
      signals.deltaWeightKg >= 0 &&
      signals.deltaWeightKg < 0.85;

    if (slowGain) {
      headline =
        "Strength stalled alongside modest weight gain — audit fundamentals before dumping more calories.";
    }

    bullets.push(
      "Hit 120–130 g protein every day—even on hectic office days.",
      "Anchor 7+ hours of sleep finishing near the same time.",
      "Add one progressively overloaded set weekly on compounds (+2–4% load or an extra sharp rep).",
    );
  }

  if (signals.workoutCompliancePct < 0.6) {
    bullets.push(
      "Workout adherence dipped—secure the 6 PM weekday rhythm before rewriting the plan.",
    );
  }

  if (signals.dietCompliancePct < 0.65) {
    bullets.push(
      "Incomplete meal ticks reduce confidence—prep grab-and-go options for lunches.",
    );
  }

  if (bullets.length === 0) {
    bullets.push(
      "Morning weights keep weekly averages trustworthy.",
      "Progress compounds +2.5 kg or +1 crisp rep weekly on cornerstone lifts.",
    );
  }

  return { headline, bullets: dedupeBullets(bullets) };
}

function dedupeBullets(entries: string[]) {
  const seen = new Set<string>();
  return entries.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}
