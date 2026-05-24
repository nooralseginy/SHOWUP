"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  seconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
  label?: string;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Timer({ seconds, onComplete, autoStart = true, label }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const completedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    completedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onComplete]);

  const pct = seconds > 0 ? (1 - remaining / seconds) * 100 : 0;

  return (
    <div className="flex flex-col items-center">
      {label ? <div className="mb-2 text-xs uppercase tracking-widest text-muted">{label}</div> : null}
      <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-line bg-panel pulse-ring">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(#d8ff36 ${pct}%, transparent ${pct}%)`,
            mask: "radial-gradient(circle, transparent 62%, black 63%)",
            WebkitMask: "radial-gradient(circle, transparent 62%, black 63%)",
          }}
        />
        <div className="relative text-5xl font-bold tabular-nums">{fmt(remaining)}</div>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-xl border border-line bg-panel px-4 py-2 text-sm"
        >
          {running ? "Pause" : "Resume"}
        </button>
        <button
          onClick={() => {
            setRemaining(0);
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete?.();
            }
          }}
          className="rounded-xl border border-line bg-panel px-4 py-2 text-sm text-muted"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
