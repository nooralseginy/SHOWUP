"use client";

import { type ReactNode } from "react";

interface Props<T extends string> {
  value: T;
  selected: T;
  onSelect: (v: T) => void;
  children: ReactNode;
}

export default function Pill<T extends string>({ value, selected, onSelect, children }: Props<T>) {
  const active = value === selected;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={[
        "rounded-2xl border px-4 py-3 text-sm font-medium transition-colors min-h-[48px]",
        active
          ? "border-accent bg-accent text-bg"
          : "border-line bg-panel text-white hover:border-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
