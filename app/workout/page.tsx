"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ExerciseCard from "@/components/ExerciseCard";
import RestTimer from "@/components/RestTimer";
import SetLogger from "@/components/SetLogger";
import Timer from "@/components/Timer";
import { COOLDOWNS, WARMUPS } from "@/lib/exercises";
import { EQUIPMENT_LABEL, EXPERIENCE_LABEL, FOCUS_LABEL, swapExercise } from "@/lib/generator";
import { finishWorkout, loadData, saveActive } from "@/lib/storage";
import { advanceSession, createSession, finishRecord, logSet, shortenSession, emptyLog, pauseSession, resumeSession, type ShortMode } from "@/lib/session";
import { formatSet, previousPerformance } from "@/lib/performance";
import type { ActiveSession, SessionRecord, SetLog } from "@/lib/types";

export default function WorkoutPage() {
  const router = useRouter();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [error, setError] = useState("");
  const [shortMenu, setShortMenu] = useState(false);
  const finishedRef = useRef(false);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);

  useEffect(() => {
    try {
      const data = loadData();
      if (!data.active && !data.plan) { router.replace("/"); return; }
      setHistory(data.history);
      const opened = data.active ? resumeSession(data.active) : createSession(data.plan!, crypto.randomUUID());
      try { const saved = saveActive(opened); sessionRef.current = saved; setSession(saved); }
      catch (e) { sessionRef.current = opened; setSession(opened); setError((e as Error).message); }
    } catch (e) { setError((e as Error).message); }
  }, [router]);

  useEffect(() => {
    const pause = () => {
      if (sessionRef.current && !finishedRef.current) {
        try { sessionRef.current = saveActive(pauseSession(sessionRef.current)); }
        catch (e) { setError((e as Error).message); }
      }
    };
    const resume = (event: PageTransitionEvent) => {
      if (!event.persisted || finishedRef.current || !sessionRef.current) return;
      try {
        const data = loadData();
        if (!data.active || data.active.id !== sessionRef.current.id) throw new Error("This workout changed in another tab. Reload to open the saved workout.");
        const saved = saveActive(resumeSession(data.active));
        sessionRef.current = saved; setSession(saved); setError("");
      } catch (e) { setError((e as Error).message); }
    };
    window.addEventListener("pagehide", pause);
    window.addEventListener("pageshow", resume);
    return () => { window.removeEventListener("pagehide", pause); window.removeEventListener("pageshow", resume); };
  }, []);

  useEffect(() => {
    let disposed = false;
    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          const lock = await navigator.wakeLock.request("screen");
          if (disposed) { await lock.release(); return; }
          wakeRef.current = lock;
        }
      } catch { /* Screen wake lock is optional. */ }
    }
    acquire();
    const handler = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", handler);
    return () => { disposed = true; document.removeEventListener("visibilitychange", handler); wakeRef.current?.release().catch(() => {}); };
  }, []);

  function change(transform: (current: ActiveSession) => ActiveSession) {
    const current = sessionRef.current;
    if (!current || finishedRef.current) return;
    const next = transform(current);
    if (next === current) return;
    sessionRef.current = next;
    setSession(next);
    try { const saved = saveActive(next); sessionRef.current = saved; setSession(saved); setError(""); }
    catch (e) { setError((e as Error).message); }
  }

  function finish(early = false) {
    const active = sessionRef.current;
    if (!active || finishedRef.current) return;
    finishedRef.current = true;
    const record = finishRecord({ ...active, endedEarly: active.endedEarly || early });
    try {
      finishWorkout(record, active.revision ?? 0);
      try { sessionStorage.setItem("showup.summary", JSON.stringify(record)); } catch { /* History remains the durable copy. */ }
      router.replace(`/summary?session=${encodeURIComponent(record.id)}`);
    } catch (e) { finishedRef.current = false; setError((e as Error).message); }
  }

  if (!session) return <main>{error ? <><p role="alert" className="text-sm text-red-300">{error}</p><Link className="mt-4 inline-block text-accent" href="/">Back to SHOWUP</Link></> : <p className="text-sm text-muted">Opening your workout…</p>}</main>;

  const { plan, logs, phase, exerciseIdx, setIdx, resting } = session;
  const current = plan.exercises[exerciseIdx];
  const completedSets = logs.flat().filter(log => log.done).length;
  const totalSets = plan.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const previous = current ? previousPerformance(history, current.exercise, session.startedAt, session.id) : undefined;
  const hasLoggedCurrent = (logs[exerciseIdx] ?? []).some(log => log.done);

  function shorten(mode: ShortMode) { change(current => shortenSession(current, mode)); setShortMenu(false); }
  function swap() {
    change(currentSession => {
      if (currentSession.phase !== "working" || currentSession.resting || currentSession.logs[currentSession.exerciseIdx].some(log => log.done)) return currentSession;
      const nextPlan = swapExercise(currentSession.plan, currentSession.exerciseIdx);
      if (nextPlan === currentSession.plan) return currentSession;
      const nextLogs = currentSession.logs.map(row => row.slice());
      nextLogs[currentSession.exerciseIdx] = Array.from({ length: nextPlan.exercises[currentSession.exerciseIdx].sets }, emptyLog);
      return { ...currentSession, plan: nextPlan, logs: nextLogs, setIdx: 0 };
    });
  }

  return <main>
    <header className="mb-4">
      <button className="min-h-11 text-xs text-muted" onClick={() => {
        try { const saved = saveActive(pauseSession(sessionRef.current ?? session)); sessionRef.current = saved; router.replace("/"); } catch (e) { setError((e as Error).message); }
      }}>Pause & leave</button>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-1">
        <h1 className="text-2xl font-bold">{FOCUS_LABEL[plan.focus]} · {plan.totalMinutes}m</h1>
        <div className="text-xs text-muted">{EXPERIENCE_LABEL[plan.experience]} · {EQUIPMENT_LABEL[plan.equipment]}</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel" role="progressbar" aria-label="Completed sets" aria-valuenow={completedSets} aria-valuemin={0} aria-valuemax={totalSets}>
        <div className="h-full bg-accent transition-[width]" style={{ width: `${totalSets ? completedSets / totalSets * 100 : 0}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">{completedSets}/{totalSets} sets logged{session.endedEarly ? " · shortened" : ""}</p>
      {phase !== "cooldown" && <button aria-expanded={shortMenu} aria-controls="short-on-time" onClick={() => setShortMenu(open => !open)} className="mt-3 min-h-11 rounded-xl border border-line bg-panel px-3 text-sm">Short on time?</button>}
      {shortMenu && phase !== "cooldown" && <section id="short-on-time" className="mt-2 rounded-xl border border-line bg-panel p-3" aria-label="Shorten this workout">
        <p className="mb-2 text-xs text-muted">Logged sets stay. Only the work still ahead changes.</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => shorten("trim")} className="rounded-lg border border-line bg-bg p-3 text-left text-sm">One fewer set per exercise</button>
          <button onClick={() => shorten("main")} className="rounded-lg border border-line bg-bg p-3 text-left text-sm">Main lifts only</button>
          <button onClick={() => finish(true)} className="rounded-lg border border-line bg-bg p-3 text-left text-sm text-accent">Finish now & save {completedSets} logged {completedSets === 1 ? "set" : "sets"}</button>
        </div>
      </section>}
    </header>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/40 p-3 text-sm text-red-300"><p>{error}</p><button className="mt-2 min-h-11 underline" onClick={() => { try { const saved = saveActive(sessionRef.current ?? session); sessionRef.current = saved; setSession(saved); setError(""); } catch (e) { setError((e as Error).message); } }}>Retry save</button></div>}

    {phase === "warmup" && <section className="flex flex-col items-center">
      <Timer key="warmup" seconds={plan.warmupSec} label="Warm-up" onComplete={() => change(advanceSession)} />
      <div className="mt-6 w-full">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Warm-up</h2>
        <ul className="mb-4 space-y-2">{WARMUPS.map(item => <li key={item.name} className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3"><span>{item.name}</span><span className="text-xs text-muted">{Math.round(item.sec / 60) || "<1"}m</span></li>)}</ul>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Your session</h2>
        <div className="space-y-2">{plan.exercises.map((planned, i) => <ExerciseCard key={planned.exercise.id + i} planned={planned} index={i} />)}</div>
      </div>
    </section>}

    {phase === "working" && current && <section>
      <ExerciseCard planned={current} index={exerciseIdx} current />
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
        <button onClick={swap} disabled={resting || hasLoggedCurrent} className="min-h-11 rounded-lg border border-line bg-panel px-3 disabled:opacity-40">Swap exercise</button>
        <span>Exercise {exerciseIdx + 1}/{plan.exercises.length}</span>
      </div>
      {hasLoggedCurrent && <p className="mt-1 text-xs text-muted">Swap is available before logging the first set.</p>}
      {previous && <details className="mt-3 rounded-xl border border-line bg-panel p-3 text-sm">
        <summary className="cursor-pointer">Last time · {new Date(previous.endedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {previous.sets.length} sets</summary>
        <ol className="mt-2 space-y-1 text-xs text-muted">{previous.sets.map((log, i) => <li key={i}>Set {i + 1}: {formatSet(log, current.exercise)}</li>)}</ol>
      </details>}
      <div className="mt-4"><SetLogger key={`${current.exercise.id}-${exerciseIdx}-${setIdx}`} planned={current} logs={logs[exerciseIdx] ?? []} currentSet={setIdx + 1} previous={previous} disabled={resting}
        onComplete={(log: SetLog) => change(currentSession => logSet(currentSession, log))} /></div>
      <div className="mt-6">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">Up next</h2>
        <div className="space-y-2">{plan.exercises.slice(exerciseIdx + 1).map((planned, i) => <ExerciseCard key={planned.exercise.id + i} planned={planned} index={exerciseIdx + i + 1} />)}</div>
      </div>
      {resting && <RestTimer key={`${session.id}-${exerciseIdx}-${setIdx}`} seconds={current.restSec} onDone={() => change(currentSession =>
        currentSession.phase === "working" && currentSession.resting && currentSession.exerciseIdx === exerciseIdx && currentSession.setIdx === setIdx ? advanceSession(currentSession) : currentSession)} />}
    </section>}

    {phase === "cooldown" && <section className="flex flex-col items-center">
      <Timer key="cooldown" seconds={plan.cooldownSec} label="Cooldown" onComplete={() => finish()} />
      <ul className="mt-6 w-full space-y-2">{COOLDOWNS.map(item => <li key={item.name} className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3"><span>{item.name}</span><span className="text-xs text-muted">{Math.round(item.sec / 60) || "<1"}m</span></li>)}</ul>
      <button onClick={() => finish()} className="mt-6 w-full rounded-2xl bg-accent py-4 text-base font-bold text-bg">Finish & see summary</button>
    </section>}
  </main>;
}
