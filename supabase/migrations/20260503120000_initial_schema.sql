-- Lean gain tracker: schema, trigger bootstrap, RLS
-- Apply with: supabase db push / supabase migration up / SQL editor

create extension if not exists "pgcrypto";

create type public.digestion_status as enum (
  'normal',
  'gas',
  'bloating',
  'heavy'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_weight_kg numeric(5, 2) not null default 62.6,
  target_weight_kg numeric(5, 2) not null default 68,
  phase_label text not null default 'May–June lean gain',
  calorie_min int not null default 2700,
  calorie_max int not null default 2800,
  protein_min_g int not null default 120,
  protein_max_g int not null default 130,
  vegetarian boolean not null default true,
  low_bloating_mode boolean not null default false,
  office_hours text default 'Office: 10:00 AM – 6:00 PM',
  gym_hours text default 'Gym weekdays: 6:00 PM – 7:00 PM',
  dinner_hours text default 'Dinner around 9:00 – 9:30 PM',
  weekend_hours text default 'Weekends: skate / badminton 6:00 PM – 11:00 PM',
  exercise_starting_loads jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.meal_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot_key text not null,
  title text not null,
  description text not null default '',
  default_kcal int not null default 0,
  default_protein_g int not null default 0,
  sort_order int not null default 0,
  unique (user_id, slot_key)
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  slot_key text not null,
  planned_kcal int not null,
  planned_protein_g int not null,
  actual_kcal int,
  actual_protein_g int,
  done_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date, slot_key)
);

create table public.workout_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 0 = Sunday … 6 = Saturday (aligned with JS getDay)
  dow int not null check (dow between 0 and 6),
  split_key text not null,
  label text not null,
  is_rest boolean not null default false,
  unique (user_id, dow)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  muscle_group text default '',
  unique (user_id, slug)
);

create table public.workout_template_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  split_key text not null,
  exercise_slug text not null,
  exercise_name text not null,
  muscle_group text default '',
  order_index int not null default 0,
  target_sets int not null default 3,
  target_reps_low int not null default 8,
  target_reps_high int not null default 12,
  unique (user_id, split_key, order_index)
);

create index workout_template_split_idx on public.workout_template_items (
  user_id,
  split_key,
  order_index
);

create table public.daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null,
  weight_kg numeric(5, 2),
  waist_cm numeric(5, 2),
  digestion public.digestion_status default 'normal',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null,
  split_key text not null,
  completed boolean not null default false,
  notes text default '',
  created_at timestamptz not null default now(),
  unique (user_id, session_date)
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_slug text not null,
  exercise_name text not null,
  set_index int not null,
  reps int not null default 0,
  weight_kg numeric(6, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index set_logs_session_idx on public.set_logs (session_id, exercise_slug, set_index);

-- ---------------------------------------------------------------------------
-- Bootstrap new auth users
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := new.id;
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

  -- Exercise catalog (per user), template items keyed by slug
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.meal_definitions enable row level security;
alter table public.meal_logs enable row level security;
alter table public.workout_schedule enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_template_items enable row level security;
alter table public.daily_snapshots enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_settings_select_own"
  on public.user_settings for select to authenticated
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_definitions_select_own"
  on public.meal_definitions for select to authenticated
  using (auth.uid() = user_id);

create policy "meal_definitions_insert_own"
  on public.meal_definitions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "meal_definitions_update_own"
  on public.meal_definitions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_definitions_delete_own"
  on public.meal_definitions for delete to authenticated
  using (auth.uid() = user_id);

create policy "meal_logs_select_own"
  on public.meal_logs for select to authenticated
  using (auth.uid() = user_id);

create policy "meal_logs_insert_own"
  on public.meal_logs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "meal_logs_update_own"
  on public.meal_logs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_logs_delete_own"
  on public.meal_logs for delete to authenticated
  using (auth.uid() = user_id);

create policy "workout_schedule_select_own"
  on public.workout_schedule for select to authenticated
  using (auth.uid() = user_id);

create policy "workout_schedule_insert_own"
  on public.workout_schedule for insert to authenticated
  with check (auth.uid() = user_id);

create policy "workout_schedule_update_own"
  on public.workout_schedule for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_schedule_delete_own"
  on public.workout_schedule for delete to authenticated
  using (auth.uid() = user_id);

create policy "exercises_select_own"
  on public.exercises for select to authenticated
  using (auth.uid() = user_id);

create policy "exercises_insert_own"
  on public.exercises for insert to authenticated
  with check (auth.uid() = user_id);

create policy "exercises_update_own"
  on public.exercises for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "exercises_delete_own"
  on public.exercises for delete to authenticated
  using (auth.uid() = user_id);

create policy "workout_template_items_select_own"
  on public.workout_template_items for select to authenticated
  using (auth.uid() = user_id);

create policy "workout_template_items_insert_own"
  on public.workout_template_items for insert to authenticated
  with check (auth.uid() = user_id);

create policy "workout_template_items_update_own"
  on public.workout_template_items for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_template_items_delete_own"
  on public.workout_template_items for delete to authenticated
  using (auth.uid() = user_id);

create policy "daily_snapshots_select_own"
  on public.daily_snapshots for select to authenticated
  using (auth.uid() = user_id);

create policy "daily_snapshots_insert_own"
  on public.daily_snapshots for insert to authenticated
  with check (auth.uid() = user_id);

create policy "daily_snapshots_update_own"
  on public.daily_snapshots for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_snapshots_delete_own"
  on public.daily_snapshots for delete to authenticated
  using (auth.uid() = user_id);

create policy "workout_sessions_select_own"
  on public.workout_sessions for select to authenticated
  using (auth.uid() = user_id);

create policy "workout_sessions_insert_own"
  on public.workout_sessions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "workout_sessions_update_own"
  on public.workout_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_sessions_delete_own"
  on public.workout_sessions for delete to authenticated
  using (auth.uid() = user_id);

create policy "set_logs_select_own"
  on public.set_logs for select to authenticated
  using (auth.uid() = user_id);

create policy "set_logs_insert_own"
  on public.set_logs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "set_logs_update_own"
  on public.set_logs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "set_logs_delete_own"
  on public.set_logs for delete to authenticated
  using (auth.uid() = user_id);
