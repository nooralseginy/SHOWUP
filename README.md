# SHOWUP

A workout planner for walking into the gym with limited time and no plan. Pick your focus, time and experience, then log each set and compare it with your own history.

Mobile-first, dark, installs to your home screen as a PWA, deploys to Vercel with zero config.

## Run it locally

```bash
npm install
npm run dev
```

Node 22.9+ is required. Check a change with:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

Open http://localhost:3000 (best viewed at phone width — DevTools mobile emulator at 390×844 works great).

## Deploy to Vercel

Easiest path:

1. Push this branch to GitHub
2. Go to https://vercel.com/new and import the repo
3. Vercel auto-detects Next.js — accept the defaults and deploy

Or from the CLI:

```bash
npm i -g vercel
vercel
```

No environment variables. No backend. Everything lives in `localStorage`.

## What's in the box

- Pick **focus** (push / pull / legs / upper / lower / full / core / conditioning), **time** (15/30/45/60), **experience** (beginner/intermediate/advanced), **equipment** (full gym / dumbbells / bodyweight), and your bodyweight
- Auto-generated session: warm-up → exercises (sets × reps scaled to your level) → cooldown
- Per-set logger (reps, weight) with rest timer between sets — vibrates and chimes when rest is up
- Optional effort/RPE, from 1 to 10; missing ratings stay unknown. No automatic training prescription.
- Previous sets for the exact exercise and per-exercise top-set trends. Highest load breaks ties by reps; bodyweight movements use reps, and planks use seconds.
- Short-on-time controls remove only unlogged work. Logged sets stay when trimming, switching to main lifts or finishing early. An exercise can be swapped before its first logged set.
- In-progress workouts resume after leaving or reloading. Deliberate pauses are excluded from recorded active time; warm-up, rest and cooldown countdowns restart when the page reloads.
- **Wake Lock**: screen stays on during the session
- **Swap exercise** if the rack is taken
- **Calorie estimate** using MET × bodyweight × actual time
- **Local history**: up to 500 sessions, with individual sets and descriptive trends. Estimated calories remain estimates.
- **Backup & restore**: versioned JSON export, validated preview and duplicate-safe merge in History. Imports preserve existing session copies and any active workout; backup preferences are restored.
- Random session button (🎲) for when you really don't want to think

## Stack

Next.js 16.4.6 (App Router) · React 19.3.1 · TypeScript · Tailwind 3 · client-side workout data.

## Existing browser data

The app reads the original `showup.prefs.v1`, `showup.plan.v1` and `showup.history.v1` keys without rewriting them. New data uses a single atomic `showup.data.v2` value. A failed write leaves the last saved value intact and displays an error. Completed sessions arriving from an older cached tab are merged by ID; seen IDs prevent explicitly cleared history from reappearing.

The test suite uses synthetic data only. It covers old records without RPE, exact exercise matching, bodyweight/hold comparisons, sparse logged-set preservation, pause duration, idempotent completion, legacy-tab merges, nested backup validation and storage failures.

## Possible future work

- Share session as an image card
- Apple Health / Strava export
- "Joint-friendly" toggle: no jumps, no heavy spinal load
- Voice cues / hands-free "next set"
- Streak + weekly muscle-group balance chart
