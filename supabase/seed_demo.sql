-- Optional 14‑day synthetic history (runs as postgres → bypasses RLS).
-- 1. Replace PUT_UUID_HERE with your user id from Supabase Authentication.
-- 2. Execute inside the SQL Editor after you have logged in once.

DO $$
DECLARE
  seed_uuid_text text := 'PUT_UUID_HERE';
  seed_user uuid;
  d date;
  i int;
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
BEGIN
  IF seed_uuid_text = 'PUT_UUID_HERE' THEN
    RAISE EXCEPTION 'Edit seed_demo.sql: replace PUT_UUID_HERE with your UUID.';
  END IF;

  BEGIN
    seed_user := trim(seed_uuid_text)::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid UUID value in seed_demo.sql.';
  END;

  IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = seed_user) THEN
    RAISE EXCEPTION 'No bootstrap data for %. Register once before seeding.', seed_user;
  END IF;

  FOR i IN 0..13 LOOP
    d := DATE '2026-05-01' + i;
    js_dow := EXTRACT(DOW FROM d)::int;

    w := ROUND((62.5 + i * 0.026 + sin(i / 3.15) * 0.065)::numeric, 2);

    INSERT INTO public.daily_snapshots (user_id, snapshot_date, weight_kg, waist_cm, digestion, notes)
    VALUES (
      seed_user,
      d,
      w,
      ROUND((75.5 + cos(i)::numeric * 0.45), 2),
      CASE (i % 5)
        WHEN 3 THEN 'gas'::public.digestion_status
        WHEN 4 THEN 'bloating'::public.digestion_status
        ELSE 'normal'::public.digestion_status
      END,
      ''
    )
    ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
      weight_kg = EXCLUDED.weight_kg,
      waist_cm = EXCLUDED.waist_cm,
      digestion = EXCLUDED.digestion,
      updated_at = now();

    FOR def IN
      SELECT slot_key, default_kcal, default_protein_g
      FROM public.meal_definitions
      WHERE user_id = seed_user
      ORDER BY sort_order
    LOOP
      INSERT INTO public.meal_logs (
        user_id, log_date, slot_key,
        planned_kcal, planned_protein_g,
        actual_kcal, actual_protein_g, done_at
      )
      VALUES (
        seed_user,
        d,
        def.slot_key,
        def.default_kcal,
        def.default_protein_g,
        GREATEST(
          ROUND(def.default_kcal * (0.9 + random() * 0.12))::int,
          ROUND(def.default_kcal * 0.82)::int
        ),
        GREATEST(
          ROUND(def.default_protein_g * (0.93 + random() * 0.08))::int,
          ROUND(def.default_protein_g * 0.85)::int
        ),
        CASE WHEN random() > 0.035 THEN timezone('utc', now()) ELSE NULL END
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

    IF COALESCE(rest_day, FALSE) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.workout_sessions (user_id, session_date, split_key, completed, notes)
    VALUES (seed_user, d, split_name, random() > 0.05, '')
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
        NULLIF((SELECT exercise_starting_loads ->> tmpl.exercise_slug
                FROM public.user_settings
                WHERE user_id = seed_user LIMIT 1), '')::numeric,
        0
      );

      FOR set_i IN 1..tmpl.target_sets LOOP
        session_weight := ROUND(
          GREATEST(
            0::numeric,
            CASE
              WHEN base_kg <= 0 THEN 0::numeric
              ELSE base_kg + (i / 6.75) +
                   ((set_i - 1)::numeric * base_kg * 0.0125)
            END
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
          LEAST(
            tmpl.target_reps_high,
            GREATEST(tmpl.target_reps_low, tmpl.target_reps_low + (((set_i + i) MOD 3)))
          ),
          CASE
            WHEN base_kg <= 0 THEN 0::numeric
            ELSE session_weight
          END
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
