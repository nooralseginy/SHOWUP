"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pill from "@/components/Pill";
import { generatePlan, FOCUS_LABEL, EXPERIENCE_LABEL, EQUIPMENT_LABEL } from "@/lib/generator";
import { loadData, beginWorkout } from "@/lib/storage";
import type { ActiveSession, Equipment, Experience, Focus } from "@/lib/types";

const FOCUS_OPTIONS: Focus[] = ["push", "pull", "legs", "upper", "lower", "full", "core", "conditioning"];
const TIME_OPTIONS = [15, 30, 45, 60];
const EXPERIENCE_OPTIONS: Experience[] = ["beginner", "intermediate", "advanced"];
const EQUIPMENT_OPTIONS: Equipment[] = ["full", "dumbbells", "bodyweight"];

export default function Home() {
  const router = useRouter();
  const [focus, setFocus] = useState<Focus>("push");
  const [time, setTime] = useState<number>(30);
  const [experience, setExperience] = useState<Experience>("intermediate");
  const [equipment, setEquipment] = useState<Equipment>("full");
  const [bodyweight, setBodyweight] = useState<number>(75);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try { const data = loadData(); setBodyweight(data.prefs.bodyweightKg); setActive(data.active); }
    catch (e) { setError((e as Error).message); }
    setLoaded(true);
  }, []);

  function start() {
    try {
    if (!Number.isFinite(bodyweight) || bodyweight <= 0 || bodyweight > 10000) throw new Error("Enter a valid bodyweight to start.");
    const plan = generatePlan({
      focus,
      experience,
      equipment,
      totalMinutes: time,
      bodyweightKg: bodyweight,
    });
    beginWorkout(plan, { bodyweightKg: bodyweight, units: "kg" });
    router.push("/workout");
    } catch (e) { setError((e as Error).message); }
  }

  function randomize() {
    setFocus(FOCUS_OPTIONS[Math.floor(Math.random() * FOCUS_OPTIONS.length)]);
    setTime(TIME_OPTIONS[Math.floor(Math.random() * TIME_OPTIONS.length)]);
  }

  if (!loaded) return null;

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted">SHOWUP</div>
          <h1 className="text-3xl font-bold leading-tight">No plan?<br />Pick three things.</h1>
        </div>
        <Link href="/history" className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-muted">
          History
        </Link>
      </div>

      {active && <div className="mb-5 rounded-2xl border border-accent/40 bg-panel p-4">
        <p className="text-sm">{FOCUS_LABEL[active.plan.focus]} workout in progress · {active.logs.flat().filter(log => log.done).length} sets logged</p>
        <Link href="/workout" className="mt-2 inline-flex min-h-11 items-center text-sm text-accent">Resume workout</Link>
        <p className="text-xs text-muted">Starting a new session saves these logged sets to History.</p>
      </div>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/40 p-3 text-sm text-red-300">{error}</p>}

      <Section title="Focus">
        <div className="grid grid-cols-2 gap-2">
          {FOCUS_OPTIONS.map((f) => (
            <Pill key={f} value={f} selected={focus} onSelect={setFocus}>
              {FOCUS_LABEL[f]}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Time">
        <div className="grid grid-cols-4 gap-2">
          {TIME_OPTIONS.map((t) => (
            <Pill key={t} value={String(t)} selected={String(time)} onSelect={(v) => setTime(Number(v))}>
              {t}m
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Experience">
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE_OPTIONS.map((e) => (
            <Pill key={e} value={e} selected={experience} onSelect={setExperience}>
              {EXPERIENCE_LABEL[e]}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Equipment">
        <div className="grid grid-cols-3 gap-2">
          {EQUIPMENT_OPTIONS.map((e) => (
            <Pill key={e} value={e} selected={equipment} onSelect={setEquipment}>
              {EQUIPMENT_LABEL[e]}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Bodyweight (for calories)">
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={10000}
            step="any"
            aria-label="Bodyweight in kilograms"
            value={bodyweight}
            onChange={(e) => setBodyweight(Number(e.target.value))}
            className="w-full bg-transparent text-2xl tabular-nums focus:outline-none"
          />
          <span className="text-sm text-muted">kg</span>
        </label>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md p-4 backdrop-blur">
        <div className="flex gap-2">
          <button
            onClick={randomize}
            className="shrink-0 rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted"
            aria-label="Randomize"
          >
            🎲
          </button>
          <button
            onClick={start}
            className="flex-1 rounded-2xl bg-accent py-4 text-base font-bold text-bg active:scale-[0.99]"
          >
            {active ? "Save current & start new" : "Show up"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  );
}
