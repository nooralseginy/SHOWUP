"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  seconds: number;
  onDone: () => void;
}

function chime() {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    o.start();
    o.stop(ctx.currentTime + 0.85);
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // ignore
  }
}

export default function RestTimer({ seconds, onDone }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([180, 80, 180]);
            chime();
            onDone();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDone]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md p-4">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-panel px-5 py-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted">Rest</div>
          <div className="text-3xl font-bold tabular-nums">
            {m}:{s.toString().padStart(2, "0")}
          </div>
        </div>
        <button
          onClick={() => {
            if (!firedRef.current) {
              firedRef.current = true;
              onDone();
            }
          }}
          className="rounded-xl border border-line bg-bg px-4 py-2 text-sm"
        >
          Skip rest
        </button>
      </div>
    </div>
  );
}
