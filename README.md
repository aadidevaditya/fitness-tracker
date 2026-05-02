# Lean Gain HQ · Personal Tracker

Interactive May–June lean bulk cockpit built with Next.js (App Router), Tailwind CSS, lightweight shadcn-style primitives, Supabase Auth + Postgres, and Recharts. Designed for deployment on Vercel with masculine, minimal styling and a mobile-first bottom navigation shell.

## Features

- Supabase email/password authentication with SSR cookie syncing via `@supabase/ssr`
- Guided routes: Dashboard, Today, Diet, Training, Progress, Settings
- Daily meal scaffolding with completion tracking & macro edits
- Workout templating plus set logging keyed to weekday splits (+ weekly progression cues)
- Weight, waist, digestion, compliance, bench press proxy charts
- Weekly advisor heuristics (calorie nudges, waist-aware cuts, plateau messaging)
- SQL migrations + optional seed script covering 14 days of synthetic adherence

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Provision Supabase

1. Create a project at [https://supabase.com](https://supabase.com).
2. Copy `.env.example` → `.env.local`.
3. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using **Project Settings → API** (either the anon key or the new publishable key works while RLS is enforced).

### 3. Apply database migrations

From the repo root:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste `supabase/migrations/20260503120000_initial_schema.sql` into Supabase Studio’s SQL Editor and run it manually.

What the migration does:

- Boots meal templates, weekday split grid, workouts, presets, digestion enum, triggers for new users (`handle_new_user`)
- Enables granular RLS for every exposed table (`auth.uid() = user_id`)

### 4. Tune Supabase Auth (developer workflow)

Until you configure SMTP:

- Navigate to **Authentication → Providers → Email** and temporarily disable email confirmations **or**
- Leave confirmations on and tap the signup link delivered to inbox.

Recommended Site URL (`Authentication → URL configuration`):

- Local: `http://localhost:3000`
- Production: `https://your.vercel.domain`

Redirect URL allow list should include `/login`.

### 5. Seed historical data (optional)

1. Replace `PUT_UUID_HERE` with your authenticated user UUID from **Authentication → Users**
2. Run `supabase/seed_demo.sql` inside the SQL Editor (runs as Postgres so RLS bypasses safely)

After seeding you should see richer charts/adherence immediately.

### 6. Start Next.js

```bash
npm run dev
```

Visit `http://localhost:3000` — authenticated users bounce to `/dashboard`, guests land on `/login`.

## Deploying to Vercel

1. Push the repo and import it into Vercel.
2. Add the Supabase variables from `.env.example` inside **Project → Settings → Environment Variables** for Production + Preview scopes.
3. Redeploy. Ensure Supabase redirect URLs mirror your Vercel domain.
4. Optional: integrate Supabase edge logs / advisors for nightly checks.

Because every protected page invokes `cookies()`/`createSupabaseServerClient()`, the deployment must include both public keys—avoid baking `service_role` into `NEXT_PUBLIC_*`.

## Operational notes

- **Mobile shell:** bottom dock keeps thumb reach consistent; dashboards stay wide up to ~5xl.
- **Weekly guidance:** heuristic only—combine with intuition and real-world stress/sleep cues.
- **Seed safety:** rerun seed after deleting rows; duplicates upsert-safe for meals/snapshots.
- **Bench chart:** derives per-session peaks for `bench_press`—swap slug in SQL if you rename lifts.

## Scripts

| Command        | Purpose                |
| -------------- | ---------------------- |
| `npm run dev`  | Local dev server       |
| `npm run build`| Production build check |
| `npm run start`| Serve built output     |
| `npm run lint` | ESLint (Next core)     |

## License

Private project for personal tracking—use at your own discretion.
# fitness-tracker
