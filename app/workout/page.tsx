"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ExerciseCard from "@/components/ExerciseCard";
import RestTimer from "@/components/RestTimer";
import SetLogger from "@/components/SetLogger";
import Timer from "@/components/Timer";
import { COOLDOWNS, WARMUPS } from "@/lib/exercises";
import { EQUIPMENT_LABEL, EXPERIENCE_LABEL, FOCUS_LABEL, swapExercise } from "@/lib/generator";
import { appendHistory, loadPlan, savePlan } from "@/lib/storage";
import type { SessionPlan, SessionRecord, SetLog } from "@/lib/types";
import { estimateKcal } from "@/lib/calories";

type Phase = "warmup" | "working" | "cooldown";

export default function WorkoutPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [phase, setPhase] = useState<Phase>("warmup");
  const [logs, setLogs] = useState<SetLog[][]>([]);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0); // 0-indexed set within current exercise
  const [resting, setResting] = useState(false);
  const startedRef = useRef<number>(Date.now());
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const p = loadPlan();
    if (!p) {
      router.replace("/");
      return;
    }
    setPlan(p);
    setLogs(p.exercises.map((pl) => Array.from({ length: pl.sets }, () => ({ reps: 0, weight: 0, done: false }))));
    startedRef.current = Date.now();
  }, [router]);

  useEffect(() => {
    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          wakeRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // ignore
      }
    }
    acquire();
    const handler = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      wakeRef.current?.release().catch(() => {});
    };
  }, []);

  const totalSets = useMemo(() => plan?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0, [plan]);
  const completedSets = useMemo(() => logs.flat().filter((l) => l.done).length, [logs]);

  if (!plan) return null;

  const current = plan.exercises[exerciseIdx];

  function onWarmupDone() {
    setPhase("working");
  }

  function onSetLogged(log: SetLog) {
    if (!plan || !current) return;
    const updated = logs.map((row) => row.slice());
    updated[exerciseIdx][setIdx] = log;
    setLogs(updated);

    const isLastSet = setIdx + 1 >= current.sets;
    const isLastExercise = exerciseIdx + 1 >= plan.exercises.length;

    if (isLastSet && isLastExercise) {
      setPhase("cooldown");
      return;
    }
    setResting(true);
  }

  function onRestDone() {
    setResting(false);
    if (!current) return;
    if (setIdx + 1 < current.sets) {
      setSetIdx((s) => s + 1);
    } else {
      setExerciseIdx((i) => i + 1);
      setSetIdx(0);
    }
  }

  function onSwap() {
    if (!plan) return;
    const next = swapExercise(plan, exerciseIdx);
    setPlan(next);
    savePlan(next);
    const updatedLogs = logs.map((r) => r.slice());
    updatedLogs[exerciseIdx] = Array.from({ length: next.exercises[exerciseIdx].sets }, () => ({
      reps: 0,
      weight: 0,
      done: false,
    }));
    setLogs(updatedLogs);
    setSetIdx(0);
  }

  function finishSession() {
    if (!plan) return;
    const endedAt = Date.now();
    const minutes = Math.max(1, Math.round((endedAt - startedRef.current) / 60000));
    const kcal = estimateKcal(plan, minutes);
    const record: SessionRecord = {
      id: `${endedAt}`,
      plan,
      logs,
      startedAt: startedRef.current,
      endedAt,
      kcal,
    };
    appendHistory(record);
    savePlan(null);
    sessionStorage.setItem("showup.summary", JSON.stringify(record));
    router.replace("/summary");
  }

  return (
    <main>
      <header className="mb-4">
        <button onClick={() => router.replace("/")} className="text-xs text-muted">
          ← Quit
        </button>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">
            {FOCUS_LABEL[plan.focus]} · {plan.totalMinutes}m
          </h1>
          <div className="text-xs text-muted">
            {EXPERIENCE_LABEL[plan.experience]} · {EQUIPMENT_LABEL[plan.equipment]}
          </div>
        </div>
        <ProgressBar value={completedSets} max={totalSets} />
      </header>

      {phase === "warmup" && (
        <section className="flex flex-col items-center">
          <Timer seconds={plan.warmupSec} label="Warm-up" onComplete={onWarmupDone} />
          <div className="mt-6 w-full">
            <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Warm-up</h2>
            <ul className="mb-4 space-y-2">
              {WARMUPS.map((w) => (
                <li key={w.name} className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3">
                  <span>{w.name}</span>
                  <span className="text-xs text-muted tabular-nums">{Math.round(w.sec / 60) || "<1"}m</span>
                </li>
              ))}
            </ul>
            <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Your session</h2>
            <div className="space-y-2">
              {plan.exercises.map((p, i) => (
                <ExerciseCard key={p.exercise.id + i} planned={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {phase === "working" && current && (
        <section>
          <ExerciseCard planned={current} index={exerciseIdx} current />
          <div className="mt-3 flex justify-between text-xs text-muted">
            <button onClick={onSwap} className="rounded-lg border border-line bg-panel px-3 py-1.5">
              Swap exercise
            </button>
            <span>
              Exercise {exerciseIdx + 1} / {plan.exercises.length}
            </span>
          </div>
          <div className="mt-4">
            <SetLogger
              planned={current}
              logs={logs[exerciseIdx] ?? []}
              currentSet={setIdx + 1}
              onComplete={onSetLogged}
            />
          </div>
          <div className="mt-6">
            <h3 className="mb-2 text-xs uppercase tracking-widest text-muted">Up next</h3>
            <div className="space-y-2">
              {plan.exercises.slice(exerciseIdx + 1).map((p, i) => (
                <ExerciseCard key={p.exercise.id + i} planned={p} index={exerciseIdx + 1 + i} />
              ))}
              {exerciseIdx + 1 >= plan.exercises.length && (
                <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-6 text-center text-sm text-muted">
                  Last exercise. Cooldown next.
                </div>
              )}
            </div>
          </div>
          {resting && current && <RestTimer seconds={current.restSec} onDone={onRestDone} />}
        </section>
      )}

      {phase === "cooldown" && (
        <section className="flex flex-col items-center">
          <Timer seconds={plan.cooldownSec} label="Cooldown" onComplete={finishSession} />
          <div className="mt-6 w-full">
            <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Cooldown</h2>
            <ul className="space-y-2">
              {COOLDOWNS.map((w) => (
                <li key={w.name} className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3">
                  <span>{w.name}</span>
                  <span className="text-xs text-muted tabular-nums">{Math.round(w.sec / 60) || "<1"}m</span>
                </li>
              ))}
            </ul>
            <button
              onClick={finishSession}
              className="mt-6 w-full rounded-2xl bg-accent py-4 text-base font-bold text-bg"
            >
              Finish & see summary →
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-panel">
      <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
