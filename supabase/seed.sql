-- -----------------------------------------------------------------------------
-- Lean Gain HQ · May–June 2026 plan sample data
--
-- Populates synthetic daily_snapshots, meal_logs, workout_sessions & set_logs
-- for EVERY calendar day from 2026-05-01 through 2026-06-30 (phase window).
--
-- HOW TO RUN
-- 1) Apply migrations (includes `bootstrap_lean_tracker_user` + signup trigger rewrite),
--    OR run the full optional bootstrap block pasted at the TOP of THIS file once.
-- 2) In the DECLARE block below either:
--    • leave seed_user_hint empty — if exactly ONE auth user exists, that user is seeded;
--    • OR set seed_user_hint to your UUID (Authentication → Users).
--
-- If `user_settings` is missing for that user (e.g. user created BEFORE trigger existed),
-- this script performs `bootstrap_lean_tracker_user()` automatically instead of failing.
--
-- Execute in SQL Editor (runs as postgres/service role · bypasses RLS).
--
-- Idempotent-ish: snapshots & meals UPSERT per day/slot; deletes then re-inserts
-- set_logs for seeded sessions.
--
-- -----------------------------------------------------------------------------
-- OPTIONAL: installs `bootstrap_lean_tracker_user` + rewires signup trigger when
-- you run ONLY this seed file without `supabase/migrations/20260503120002_*.sql`.
-- Safe to rerun (functions use CREATE OR REPLACE).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_lean_tracker_user(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.meal_definitions (user_id, slot_key, title, description, default_kcal, default_protein_g, sort_order)
  VALUES
    (uid, 'morning_shake', 'Morning shake', 'Toned milk or curd smoothie + banana + peanut butter. Low-bloat: avoid raw full-cream milk; prefer toned milk/curd; skip seeds if flaring.', 420, 22, 0),
    (uid, 'breakfast', 'Breakfast', 'Paneer sandwich or moong chilla + curd + optional whey (vegetarian).', 520, 32, 1),
    (uid, 'lunch', 'Lunch', '3 roti + dal + rice + paneer/soya chunk curry.', 720, 38, 2),
    (uid, 'pre_workout', 'Pre-workout', 'Banana before gym.', 110, 1, 3),
    (uid, 'post_workout', 'Post-workout', 'Whey protein shake.', 140, 28, 4),
    (uid, 'dinner', 'Dinner', '3 roti + sabzi + paneer/tofu/dal (9–9:30 PM).', 680, 36, 5),
    (uid, 'pre_sleep_milk', 'Pre-sleep milk', 'Small glass of toned milk before bed.', 120, 8, 6)
  ON CONFLICT (user_id, slot_key) DO NOTHING;

  INSERT INTO public.workout_schedule (user_id, dow, split_key, label, is_rest) VALUES
    (uid, 0, 'active_recovery', 'Sunday · Active recovery', false),
    (uid, 1, 'push', 'Monday · Push', false),
    (uid, 2, 'pull', 'Tuesday · Pull', false),
    (uid, 3, 'legs', 'Wednesday · Legs', false),
    (uid, 4, 'rest', 'Thursday · Rest', true),
    (uid, 5, 'upper', 'Friday · Upper', false),
    (uid, 6, 'lower_or_sports', 'Saturday · Lower / sports', false)
  ON CONFLICT (user_id, dow) DO NOTHING;

  INSERT INTO public.exercises (user_id, slug, name, muscle_group) VALUES
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
  ON CONFLICT (user_id, slug) DO NOTHING;

  INSERT INTO public.workout_template_items (user_id, split_key, exercise_slug, exercise_name, muscle_group, order_index, target_sets, target_reps_low, target_reps_high) VALUES
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
  ON CONFLICT (user_id, split_key, order_index) DO NOTHING;

  UPDATE public.user_settings SET
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
    updated_at = NOW()
  WHERE user_id = uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bootstrap_lean_tracker_user(NEW.id);
  RETURN NEW;
END;
$$;

-----------------------------------------------------------------------------

DO $$
DECLARE
  -- Paste UUID between quotes for multi-user projects, or leave '' for solo auto-pick
  seed_user_hint text := '';

  seed_user uuid;
  auth_user_count bigint;

  phase_start constant date := date '2026-05-01';
  phase_end constant date := date '2026-06-30';
  day_span int;

  d date;
  day_idx int;
  js_dow int;
  rest_day boolean;
  split_name text;
  sess uuid;
  w numeric;
  def record;
  tmpl record;
  set_i int;
  base_kg numeric;
  session_weight numeric;

  target_goal_kg constant numeric := 68;
BEGIN
  IF trim(coalesce(seed_user_hint, '')) <> '' THEN
    BEGIN
      seed_user := trim(seed_user_hint)::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'supabase/seed.sql: seed_user_hint must be a valid UUID string.';
    END;
  ELSE
    SELECT COUNT(*) INTO auth_user_count FROM auth.users;

    IF auth_user_count = 1 THEN
      SELECT id INTO STRICT seed_user
      FROM auth.users
      ORDER BY created_at DESC
      LIMIT 1;
    ELSE
      RAISE EXCEPTION
        'Provide seed_user_hint in DECLARE (UUID from Authentication → Users), or trim auth.users to one row for auto-pick. Current users: %',
        auth_user_count;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = seed_user) THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = seed_user) THEN
      RAISE EXCEPTION 'Seed target % does not exist in auth.users.', seed_user;
    END IF;

    PERFORM public.bootstrap_lean_tracker_user(seed_user);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = seed_user) THEN
    RAISE EXCEPTION
      'Bootstrap still missing for %. Check that schemas + FK to auth.users are applied.',
      seed_user;
  END IF;

  day_span := (phase_end - phase_start)::int;

  UPDATE public.user_settings
  SET
    phase_label = 'May–June lean gain (2026)',
    current_weight_kg = 62.6,
    target_weight_kg = target_goal_kg,
    calorie_min = 2700,
    calorie_max = 2800,
    protein_min_g = 120,
    protein_max_g = 130,
    vegetarian = true,
    office_hours = 'Office: 10:00 AM – 6:00 PM',
    gym_hours = 'Gym weekdays: 6:00 PM – 7:00 PM',
    dinner_hours = 'Dinner: 9:00 – 9:30 PM',
    weekend_hours = 'Weekends: skate / badminton 6:00 PM – 11:00 PM',
    updated_at = now()
  WHERE user_id = seed_user;

  FOR day_idx IN 0..day_span LOOP
    d := phase_start + day_idx;
    js_dow := extract(dow from d)::int;

    w := round(
      (62.55 + ((day_idx::numeric / greatest(day_span, 1)::numeric)) * (target_goal_kg - 62.55)::numeric)
        + sin(day_idx / 4.75) * 0.065,
      2
    );

    INSERT INTO public.daily_snapshots (
      user_id,
      snapshot_date,
      weight_kg,
      waist_cm,
      digestion,
      notes
    )
    VALUES (
      seed_user,
      d,
      w,
      round((75.2 + cos(day_idx / 3)::numeric * 0.55), 2),
      case (day_idx % 7)
        when 5 then 'gas'::public.digestion_status
        when 6 then 'bloating'::public.digestion_status
        else 'normal'::public.digestion_status
      end,
      CASE
        WHEN extract(dow from d) in (6, 0)
          THEN 'Weekend skate/badminton block'
        ELSE 'Office cadence day'
      END
    )
    ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
      weight_kg = EXCLUDED.weight_kg,
      waist_cm = EXCLUDED.waist_cm,
      digestion = EXCLUDED.digestion,
      notes = EXCLUDED.notes,
      updated_at = now();

    FOR def IN
      SELECT slot_key, default_kcal, default_protein_g
      FROM public.meal_definitions
      WHERE user_id = seed_user
      ORDER BY sort_order
    LOOP
      INSERT INTO public.meal_logs (
        user_id,
        log_date,
        slot_key,
        planned_kcal,
        planned_protein_g,
        actual_kcal,
        actual_protein_g,
        done_at
      )
      VALUES (
        seed_user,
        d,
        def.slot_key,
        def.default_kcal,
        def.default_protein_g,
        greatest(
          round(def.default_kcal * (0.9 + random() * 0.12))::int,
          round(def.default_kcal * 0.84)::int
        ),
        greatest(
          round(def.default_protein_g * (0.93 + random() * 0.08))::int,
          round(def.default_protein_g * 0.86)::int
        ),
        CASE WHEN random() > 0.04 THEN timezone('utc', now()) ELSE NULL END
      )
      ON CONFLICT (user_id, log_date, slot_key) DO UPDATE SET
        actual_kcal = EXCLUDED.actual_kcal,
        actual_protein_g = EXCLUDED.actual_protein_g,
        done_at = EXCLUDED.done_at,
        updated_at = now();
    END LOOP;

    SELECT is_rest, workout_schedule.split_key
      INTO rest_day, split_name
      FROM public.workout_schedule
      WHERE user_id = seed_user AND workout_schedule.dow = js_dow;

    IF COALESCE(rest_day, false) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.workout_sessions (
      user_id,
      session_date,
      split_key,
      completed,
      notes
    )
    VALUES (
      seed_user,
      d,
      split_name,
      random() > 0.07,
      ''
    )
    ON CONFLICT (user_id, session_date) DO UPDATE SET
      split_key = EXCLUDED.split_key,
      completed = EXCLUDED.completed
    RETURNING id INTO sess;

    DELETE FROM public.set_logs WHERE session_id = sess;

    FOR tmpl IN
      SELECT *
      FROM public.workout_template_items
      WHERE user_id = seed_user AND split_key = split_name
      ORDER BY order_index
    LOOP
      base_kg := COALESCE(
        NULLIF(
          (
            SELECT exercise_starting_loads ->> tmpl.exercise_slug
            FROM public.user_settings
            WHERE user_id = seed_user
            LIMIT 1
          ),
          ''
        )::numeric,
        0
      );

      FOR set_i IN 1..tmpl.target_sets LOOP
        session_weight := round(
          greatest(
            0::numeric,
            case
              when base_kg <= 0 then 0::numeric
              else
                base_kg
                  + ((day_idx::numeric / 45.0) * 4.75)
                  + ((set_i - 1)::numeric * base_kg * 0.012)
            end
          ),
          2
        );

        INSERT INTO public.set_logs (
          user_id,
          session_id,
          exercise_slug,
          exercise_name,
          set_index,
          reps,
          weight_kg
        )
        VALUES (
          seed_user,
          sess,
          tmpl.exercise_slug,
          tmpl.exercise_name,
          set_i - 1,
          least(
            tmpl.target_reps_high,
            greatest(
              tmpl.target_reps_low,
              tmpl.target_reps_low + (((set_i + day_idx) % 4))
            )
          ),
          case
            when base_kg <= 0 then 0::numeric
            else session_weight
          end
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded May–June plan (% → %) for user %.', phase_start, phase_end, seed_user;
END $$;
