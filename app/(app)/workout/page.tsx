import { SessionBoard } from "@/components/workout/session-board";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { utcTodayString } from "@/lib/dates";
import { ensureWorkoutSession } from "@/lib/workouts/sync";

export default async function WorkoutPage() {
  const { supabase, user } = await requireUser();
  const today = utcTodayString();
  const dow = new Date(`${today}T12:00:00`).getDay();

  await ensureWorkoutSession(supabase, {
    userId: user.id,
    isoDate: today,
    dow,
  });

  const { data: schedule } = await supabase
    .from("workout_schedule")
    .select("*")
    .eq("user_id", user.id)
    .eq("dow", dow)
    .maybeSingle();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("session_date", today)
    .maybeSingle();

  const restDay =
    !schedule || Boolean(schedule.is_rest) || schedule.split_key === "rest";

  if (restDay) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.36em] text-neutral-400">
            Movement menu
          </p>
          <h1 className="text-3xl font-semibold text-neutral-50">
            Recovery / active play
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Walk, skate, badminton window 6pm-11pm on weekends, or deliberate rest.
            Keep meals locked so training days punch harder.
          </p>
        </header>
        <Card>
          <CardContent className="space-y-2 p-6 text-sm text-neutral-300">
            <p className="text-lg font-semibold text-neutral-100">
              {schedule?.label ?? "No lift scheduled"}
            </p>
            <p>Use Today to hold nutrition + digestion signals.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: templateItems } = await supabase
    .from("workout_template_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("split_key", schedule.split_key)
    .order("order_index", { ascending: true });

  let initialLogs:
    | {
        exercise_slug: string;
        exercise_name: string;
        reps: number;
        weight_kg: number | null;
        set_index: number;
      }[]
    | null = [];

  if (session?.id) {
    const { data: logs } = await supabase
      .from("set_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("set_index", { ascending: true });
    initialLogs = logs ?? [];
  }

  const startingLoads =
    (settings?.exercise_starting_loads ?? {}) as Record<
      string,
      number | string | null | undefined
    >;

  if (!session?.id) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-neutral-50">Provisioning…</h1>
        <p className="text-sm text-neutral-400">
          Session shell is syncing. Reload once—or confirm Supabase connection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.38em] text-neutral-400">
          Training cockpit
        </p>
        <h1 className="text-3xl font-semibold text-neutral-50">Lift ledger</h1>
        <p className="text-sm text-neutral-400">{schedule.label}</p>
      </header>

      <SessionBoard
        sessionDate={today}
        splitKey={schedule.split_key}
        label={schedule.label}
        items={(templateItems ?? []).map((row) => ({
          split_key: row.split_key,
          exercise_slug: row.exercise_slug,
          exercise_name: row.exercise_name,
          target_sets: row.target_sets,
          target_reps_low: row.target_reps_low,
          target_reps_high: row.target_reps_high,
        }))}
        startingLoads={startingLoads}
        initialSets={(initialLogs ?? []).map((row) => ({
          exercise_slug: row.exercise_slug,
          exercise_name: row.exercise_name,
          reps: row.reps,
          weight: Number(row.weight_kg ?? 0),
          set_index: row.set_index,
        }))}
        defaultCompleted={Boolean(session.completed)}
      />
    </div>
  );
}
