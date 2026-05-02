-- Reusable bootstrap (meals / schedule / templates) callable when signup trigger missed.
-- Runs AFTER initial schema migration (needs tables).

create or replace function public.bootstrap_lean_tracker_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (uid)
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  insert into public.meal_definitions (user_id, slot_key, title, description, default_kcal, default_protein_g, sort_order)
  values
    (uid, 'morning_shake', 'Morning shake', 'Toned milk or curd smoothie + banana + peanut butter. Low-bloat: avoid raw full-cream milk; prefer toned milk/curd; skip seeds if flaring.', 420, 22, 0),
    (uid, 'breakfast', 'Breakfast', 'Paneer sandwich or moong chilla + curd + optional whey (vegetarian).', 520, 32, 1),
    (uid, 'lunch', 'Lunch', '3 roti + dal + rice + paneer/soya chunk curry.', 720, 38, 2),
    (uid, 'pre_workout', 'Pre-workout', 'Banana before gym.', 110, 1, 3),
    (uid, 'post_workout', 'Post-workout', 'Whey protein shake.', 140, 28, 4),
    (uid, 'dinner', 'Dinner', '3 roti + sabzi + paneer/tofu/dal (9–9:30 PM).', 680, 36, 5),
    (uid, 'pre_sleep_milk', 'Pre-sleep milk', 'Small glass of toned milk before bed.', 120, 8, 6)
  on conflict (user_id, slot_key) do nothing;

  insert into public.workout_schedule (user_id, dow, split_key, label, is_rest) values
    (uid, 0, 'active_recovery', 'Sunday · Active recovery', false),
    (uid, 1, 'push', 'Monday · Push', false),
    (uid, 2, 'pull', 'Tuesday · Pull', false),
    (uid, 3, 'legs', 'Wednesday · Legs', false),
    (uid, 4, 'rest', 'Thursday · Rest', true),
    (uid, 5, 'upper', 'Friday · Upper', false),
    (uid, 6, 'lower_or_sports', 'Saturday · Lower / sports', false)
  on conflict (user_id, dow) do nothing;

  insert into public.exercises (user_id, slug, name, muscle_group) values
    (uid, 'bench_press', 'Bench press', 'Chest'),
    (uid, 'overhead_press', 'Overhead press', 'Shoulders'),
    (uid, 'dip_machine', 'Triceps dips / assisted dip', 'Triceps'),
    (uid, 'triceps_pushdown', 'Triceps pushdown', 'Triceps'),
    (uid, 'lat_pulldown', 'Lat pulldown', 'Back'),
    (uid, 'barbell_row', 'Barbell row', 'Back'),
    (uid, 'face_pull', 'Face pull', 'Rear delt'),
    (uid, 'dumbbell_curl', 'Dumbbell curl', 'Biceps'),
    (uid, 'back_squat', 'Back squat', 'Legs'),
    (uid, 'romanian_deadlift', 'Romanian deadlift', 'Hamstrings'),
    (uid, 'leg_press', 'Leg press', 'Legs'),
    (uid, 'standing_calf', 'Standing calf raise', 'Calves'),
    (uid, 'incline_press', 'Incline dumbbell press', 'Chest'),
    (uid, 'cable_row', 'Seated cable row', 'Back'),
    (uid, 'trap_bar_deadlift', 'Trap bar deadlift', 'Posterior chain'),
    (uid, 'goblet_squat', 'Goblet squat', 'Legs'),
    (uid, 'walking_lunge', 'Walking lunge', 'Legs')
  on conflict (user_id, slug) do nothing;

  insert into public.workout_template_items (user_id, split_key, exercise_slug, exercise_name, muscle_group, order_index, target_sets, target_reps_low, target_reps_high) values
    (uid, 'push', 'bench_press', 'Bench press', 'Chest', 0, 4, 6, 8),
    (uid, 'push', 'overhead_press', 'Overhead press', 'Shoulders', 1, 3, 8, 10),
    (uid, 'push', 'dip_machine', 'Triceps dips / assisted dip', 'Triceps', 2, 3, 8, 12),
    (uid, 'push', 'triceps_pushdown', 'Triceps pushdown', 'Triceps', 3, 3, 12, 15),
    (uid, 'pull', 'lat_pulldown', 'Lat pulldown', 'Back', 0, 4, 6, 10),
    (uid, 'pull', 'barbell_row', 'Barbell row', 'Back', 1, 3, 8, 10),
    (uid, 'pull', 'face_pull', 'Face pull', 'Rear delt', 2, 3, 15, 20),
    (uid, 'pull', 'dumbbell_curl', 'Dumbbell curl', 'Biceps', 3, 3, 10, 15),
    (uid, 'legs', 'back_squat', 'Back squat', 'Legs', 0, 4, 5, 8),
    (uid, 'legs', 'romanian_deadlift', 'Romanian deadlift', 'Hamstrings', 1, 3, 8, 10),
    (uid, 'legs', 'leg_press', 'Leg press', 'Legs', 2, 3, 10, 15),
    (uid, 'legs', 'standing_calf', 'Standing calf raise', 'Calves', 3, 4, 15, 20),
    (uid, 'upper', 'incline_press', 'Incline dumbbell press', 'Chest', 0, 4, 8, 12),
    (uid, 'upper', 'lat_pulldown', 'Lat pulldown', 'Back', 1, 3, 10, 12),
    (uid, 'upper', 'cable_row', 'Seated cable row', 'Back', 2, 3, 8, 12),
    (uid, 'upper', 'overhead_press', 'Overhead press', 'Shoulders', 3, 3, 8, 10),
    (uid, 'lower_or_sports', 'trap_bar_deadlift', 'Trap bar deadlift', 'Posterior chain', 0, 4, 5, 8),
    (uid, 'lower_or_sports', 'goblet_squat', 'Goblet squat', 'Legs', 1, 3, 10, 15),
    (uid, 'lower_or_sports', 'walking_lunge', 'Walking lunge', 'Legs', 2, 3, 12, 12),
    (uid, 'active_recovery', 'walking_lunge', 'Light walking / skating / mobility', 'Conditioning', 0, 1, 20, 30)
  on conflict (user_id, split_key, order_index) do nothing;

  update public.user_settings set
    exercise_starting_loads = '{
      "bench_press": 40,
      "overhead_press": 25,
      "dip_machine": 0,
      "triceps_pushdown": 12.5,
      "lat_pulldown": 45,
      "barbell_row": 35,
      "face_pull": 15,
      "dumbbell_curl": 8,
      "back_squat": 50,
      "romanian_deadlift": 40,
      "leg_press": 80,
      "standing_calf": 40,
      "incline_press": 14,
      "cable_row": 35,
      "trap_bar_deadlift": 60,
      "goblet_squat": 20,
      "walking_lunge": 0
    }'::jsonb,
    updated_at = now()
  where user_id = uid;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bootstrap_lean_tracker_user(new.id);
  return new;
end;
$$;
