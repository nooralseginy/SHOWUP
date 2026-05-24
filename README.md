# SHOWUP

Random gym workout generator. You walk into the gym with no plan and limited time. SHOWUP asks three things — **focus**, **time**, **experience** — drops you into a warm-up timer with the full session laid out, lets you log every set, then shows total work + average calories burned.

Mobile-first, dark, installs to your home screen as a PWA, deploys to Vercel with zero config.

## Run it locally

```bash
npm install
npm run dev
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
- **Wake Lock**: screen stays on during the session
- **Swap exercise** if the rack is taken
- **Calorie estimate** using MET × bodyweight × actual time
- **Local history**: last 50 sessions, last-7-days kcal at the top
- Random session button (🎲) for when you really don't want to think

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · client-only · `localStorage`.

## Ideas worth noting (not built — your call which to ship next)

- Progressive overload suggestions based on last session's weights
- RPE (rate of perceived exertion) per set
- Share session as an image card
- Apple Health / Strava export
- "Joint-friendly" toggle: no jumps, no heavy spinal load
- Hard time-cap mode: app reorders/cuts on the fly to fit
- Voice cues / hands-free "next set"
- Streak + weekly muscle-group balance chart
