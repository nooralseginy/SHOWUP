import test from "node:test";
import assert from "node:assert/strict";
import { defaultData, readBackup, isSetLog, mergeBackup, mergeHistory, type Backup } from "../lib/data";
import { loadData, loadHistory, savePrefs, savePlan, saveActive, finishWorkout, exportBackup, importBackup, clearHistory, beginWorkout } from "../lib/storage";
import { createSession, finishRecord } from "../lib/session";
import { browser, plan, record } from "./fixtures";

const backup = (): Backup => ({ app: "showup", version: 1, exportedAt: 3000, data: { ...defaultData(), history: [record()] } });

test("backup round-trip preserves embedded historical exercise snapshots and unknown effort", () => {
  const value = backup(); value.data.history[0].plan.exercises[0].exercise.id = "retired-catalog-id";
  const restored = readBackup(JSON.stringify(value));
  assert.deepEqual(restored, value);
  assert.equal(restored.data.history[0].logs[0][0].rpe, undefined);
});

test("backup rejects wrong app/version, malformed nested arrays and non-finite values", () => {
  for (const mutate of [
    (b: Backup) => { (b as unknown as { app: string }).app = "another-app"; },
    (b: Backup) => { (b as unknown as { version: number }).version = 2; },
    (b: Backup) => { b.data.history[0].logs[0] = []; },
    (b: Backup) => { b.data.history[0].logs[0][0].weight = Infinity; },
    (b: Backup) => { b.data.history[0].logs[0][0].rpe = 11; },
  ]) {
    const value = backup(); mutate(value);
    assert.throws(() => readBackup(JSON.stringify(value)));
  }
  assert.throws(() => readBackup("not json"));
});

test("effort is optional and bounded without converting unknown values to zero", () => {
  assert.equal(isSetLog({ reps: 10, weight: 0, done: true }), true);
  assert.equal(isSetLog({ reps: 10, weight: 0, done: true, rpe: 7.5 }), true);
  for (const rpe of [0, 10.5, 7.2, NaN, null]) assert.equal(isSetLog({ reps: 10, weight: 0, done: true, rpe }), false);
});

test("merge is idempotent, preserves local copies and keeps an active workout", () => {
  const data = defaultData(); data.history = [record("same", 4000)]; data.history[0].logs[0][0].weight = 60;
  data.active = createSession(plan(), "active", 1000); data.plan = data.active.plan;
  const incoming = backup(); incoming.data.history = [record("same", 4000), record("new", 3000)]; incoming.data.prefs.bodyweightKg = 80;
  const merged = mergeBackup(data, incoming);
  assert.equal(merged.history.length, 2);
  assert.equal(merged.history[0].logs[0][0].weight, 60);
  assert.equal(merged.active, data.active);
  assert.equal(merged.prefs.bodyweightKg, 80);
  assert.deepEqual(mergeBackup(merged, incoming), merged);
});

test("history limit fails explicitly without dropping either collection", () => {
  const existing = Array.from({ length: 500 }, (_, i) => record(String(i)));
  assert.throws(() => mergeHistory(existing, [record("one-more")]));
  assert.equal(existing.length, 500);
});

test("legacy v1 data migrates on first save while its original keys stay exact", () => {
  const storage = browser();
  const original = JSON.stringify([record()]);
  storage.setItem("showup.history.v1", original);
  storage.setItem("showup.prefs.v1", JSON.stringify({ bodyweightKg: 82, units: "kg" }));
  assert.equal(loadData().history.length, 1);
  assert.equal(storage.getItem("showup.data.v2"), null);
  savePrefs({ bodyweightKg: 83, units: "kg" });
  assert.equal(loadData().prefs.bodyweightKg, 83);
  assert.equal(storage.getItem("showup.history.v1"), original);
});

test("new sessions from an old cached tab merge once and cleared history does not return", () => {
  const storage = browser();
  storage.setItem("showup.history.v1", JSON.stringify([record("old")]));
  savePrefs({ bodyweightKg: 75, units: "kg" });
  storage.setItem("showup.history.v1", JSON.stringify([record("late", 4000), record("old")]));
  assert.deepEqual(loadHistory().map(r => r.id), ["late", "old"]);
  clearHistory();
  assert.equal(loadHistory().length, 0);
  storage.setItem("showup.history.v1", JSON.stringify([record("new-after-clear", 5000), record("late", 4000), record("old")]));
  assert.deepEqual(loadHistory().map(r => r.id), ["new-after-clear"]);
});

test("failed finish or import writes leave saved history and active workout intact", () => {
  const storage = browser(); const active = createSession(plan(), "active", 1000);
  active.logs[0][0] = { reps: 10, weight: 40, done: true }; savePlan(active.plan); saveActive(active);
  const before = storage.getItem("showup.data.v2");
  storage.failWrite = true;
  assert.throws(() => finishWorkout(finishRecord(active, 3000)));
  assert.throws(() => importBackup(backup()));
  assert.equal(storage.getItem("showup.data.v2"), before);
  assert.equal(loadData().active?.logs[0][0].weight, 40);
});

test("completion is idempotent when timer and manual finish reach the same session", () => {
  browser(); const active = createSession(plan(), "one-id", 1000); savePlan(active.plan); saveActive(active);
  finishWorkout(finishRecord(active, 3000)); finishWorkout(finishRecord(active, 4000));
  assert.equal(loadHistory().length, 1);
  assert.equal(loadHistory()[0].endedAt, 3000);
  assert.equal(loadData().active, null);
});

test("starting a replacement workout archives logged work atomically", () => {
  const storage = browser(); const active = createSession(plan(), "active", 1000);
  active.logs[0][0] = { reps: 10, weight: 40, done: true }; savePlan(active.plan); saveActive(active);
  const before = storage.getItem("showup.data.v2"); storage.failWrite = true;
  assert.throws(() => beginWorkout({ ...plan(), createdAt: 5000 }, { bodyweightKg: 80, units: "kg" }, 5000));
  assert.equal(storage.getItem("showup.data.v2"), before);
  storage.failWrite = false; const writes = storage.writes;
  beginWorkout({ ...plan(), createdAt: 5000 }, { bodyweightKg: 80, units: "kg" }, 5000);
  assert.equal(storage.writes, writes + 1);
  assert.equal(loadHistory()[0].logs[0][0].weight, 40);
  assert.equal(loadData().plan?.createdAt, 5000);
});

test("blocked reads and invalid legacy data do not overwrite any stored value", () => {
  const storage = browser(); storage.setItem("showup.history.v1", "{invalid");
  assert.throws(() => savePrefs({ bodyweightKg: 80, units: "kg" }));
  assert.equal(storage.getItem("showup.data.v2"), null);
  assert.equal(storage.getItem("showup.history.v1"), "{invalid");
  storage.failRead = true; assert.throws(() => loadData());
});

test("export remains available when quota blocks importing late legacy records", () => {
  const storage = browser(); storage.setItem("showup.history.v1", JSON.stringify([record("old")]));
  savePrefs({ bodyweightKg: 75, units: "kg" });
  storage.setItem("showup.history.v1", JSON.stringify([record("late", 4000), record("old")])); storage.failWrite = true;
  const exported = exportBackup();
  assert.equal(exported.data.history.length, 2);
  assert.deepEqual(readBackup(JSON.stringify(exported)), exported);
});

test("a stale pagehide save cannot revive a finished workout", () => {
  browser(); const original = createSession(plan(), "finished", 1000); savePlan(original.plan);
  const saved = saveActive(original);
  finishWorkout(finishRecord(saved, 3000), saved.revision);
  assert.throws(() => saveActive(saved), /another tab/);
  assert.equal(loadData().active, null);
  assert.equal(loadHistory().length, 1);
});

test("a stale completion cannot clear a newer active or pending workout", () => {
  browser(); const original = createSession(plan(), "old-tab", 1000); savePlan(original.plan);
  const old = saveActive(original);
  finishWorkout(finishRecord(old, 3000), old.revision);
  beginWorkout({ ...plan(), createdAt: 4000 }, { bodyweightKg: 75, units: "kg" }, 4000);
  const newSession = loadData().active!;
  finishWorkout(finishRecord(old, 5000), old.revision);
  assert.equal(loadData().active?.id, newSession.id);
  assert.throws(() => saveActive(old));
  savePlan({ ...plan(), createdAt: 6000 });
  finishWorkout(finishRecord(old, 7000), old.revision);
  assert.equal(loadData().plan?.createdAt, 6000);
});

test("concurrent copies of the same workout must match its saved revision", () => {
  browser(); const original = createSession(plan(), "same-id", 1000); savePlan(original.plan);
  const tabA = saveActive(original);
  const tabB = structuredClone(tabA);
  tabA.logs[0][0] = { reps: 10, weight: 40, done: true };
  const latest = saveActive(tabA);
  assert.throws(() => saveActive(tabB), /another tab/);
  assert.throws(() => finishWorkout(finishRecord(tabB, 3000), tabB.revision), /another tab/);
  assert.deepEqual(loadData().active, latest);
});

test("a stale first claim cannot replace a different pending plan", () => {
  browser(); savePlan({ ...plan(), createdAt: 2000 });
  assert.throws(() => saveActive(createSession(plan(), "stale", 1000)), /another tab/);
  assert.equal(loadData().plan?.createdAt, 2000);
});
