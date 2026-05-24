"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pill from "@/components/Pill";
import { generatePlan, FOCUS_LABEL, EXPERIENCE_LABEL, EQUIPMENT_LABEL } from "@/lib/generator";
import { loadPrefs, savePlan, savePrefs } from "@/lib/storage";
import type { Equipment, Experience, Focus } from "@/lib/types";

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

  useEffect(() => {
    const p = loadPrefs();
    setBodyweight(p.bodyweightKg);
    setLoaded(true);
  }, []);

  function start() {
    savePrefs({ bodyweightKg: bodyweight, units: "kg" });
    const plan = generatePlan({
      focus,
      experience,
      equipment,
      totalMinutes: time,
      bodyweightKg: bodyweight,
    });
    savePlan(plan);
    router.push("/workout");
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
            Show up →
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
