"use client";

import { useState } from "react";
import { readBackup, type Backup } from "@/lib/data";
import { exportBackup, importBackup, loadHistory } from "@/lib/storage";

export default function BackupControls({ onRestore }: { onRestore: () => void }) {
  const [backup, setBackup] = useState<Backup | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const button = "rounded-xl border border-line bg-bg px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

  function download() {
    try {
      const data = exportBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `showup-backup-${new Date(data.exportedAt).toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
      setMessage("Backup downloaded. Keep it somewhere you can find again.");
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <details className="mt-6 rounded-2xl border border-line bg-panel p-4">
      <summary className="cursor-pointer text-sm font-semibold">Backup & restore</summary>
      <p className="mt-3 text-xs leading-relaxed text-muted">Your workouts stay in this browser. Export a file before switching devices or clearing browser data.</p>
      <button onClick={download} className={`${button} mt-3`}>Export backup</button>
      <label className="mt-4 block text-xs text-muted" htmlFor="backup-file">Choose a SHOWUP backup to merge</label>
      <input id="backup-file" type="file" accept=".json,application/json" className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-bg file:px-3 file:py-2 file:text-white"
        onChange={async event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          setBackup(null); setError(""); setMessage("");
          if (!file) return;
          try {
            if (file.size > 5_000_000) throw new Error("This backup is too large to import.");
            const parsed = readBackup(await file.text());
            const existing = new Set(loadHistory().map(record => record.id));
            setNewCount(new Set(parsed.data.history.filter(record => !existing.has(record.id)).map(record => record.id)).size);
            setBackup(parsed);
          } catch (e) { setError((e as Error).message); }
        }} />
      {backup && <div className="mt-3 rounded-xl border border-line p-3">
        <p className="text-sm">Add {newCount} {newCount === 1 ? "session" : "sessions"} from {new Date(backup.exportedAt).toLocaleDateString()}?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">Existing sessions and any workout in progress stay. Preferences come from this backup.</p>
        <div className="mt-3 flex gap-2">
          <button className={`${button} border-accent text-accent`} onClick={() => {
            try { const count = importBackup(backup); setBackup(null); setError(""); setMessage(`Restored ${count} new ${count === 1 ? "session" : "sessions"}.`); onRestore(); }
            catch (e) { setError((e as Error).message); }
          }}>Merge backup</button>
          <button className={button} onClick={() => setBackup(null)}>Cancel</button>
        </div>
      </div>}
      {message && <p role="status" className="mt-3 text-xs text-muted">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </details>
  );
}
