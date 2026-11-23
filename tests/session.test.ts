import test from "node:test";
import assert from "node:assert/strict";
import { exerciseSeries, previousPerformance, topSet, formatSet } from "../lib/performance";
import { createSession, advanceSession, logSet, shortenSession, finishRecord, pauseSession, resumeSession, durationMs } from "../lib/session";
import { lift, accessory, plan, record } from "./fixtures";

test("previous performance matches exercise IDs, sorts imports and excludes current/future records", () => {
  const unrelated = record("other", 3500); unrelated.plan.exercises[0].exercise = { ...lift, id: "another-bench" };
  const current = record("current", 4000);
  const previous = previousPerformance([current, record("early", 2000), unrelated, record("late", 3000), record("future", 6000)], lift, 5000, "current");
  assert.equal(previous?.sessionId, "late");
  assert.equal(previous?.sets[0].rpe, undefined);
  assert.equal(exerciseSeries([record()], { ...lift, id: "new-id" }).length, 0);
});

test("top sets compare actual load then reps; bodyweight and holds use reps/seconds", () => {
  const sets = [{ reps: 20, weight: 40, done: true }, { reps: 5, weight: 50, done: true, rpe: 8 }, { reps: 6, weight: 50, done: true }];
  assert.equal(topSet(sets, true)?.reps, 6);
  assert.equal(topSet([{ reps: 15, weight: 0, done: true }, { reps: 99, weight: 0, done: false }], false)?.reps, 15);
  assert.equal(formatSet({ reps: 30, weight: 0, done: true }, { ...accessory, id: "plank" }), "30s");
  assert.match(formatSet(sets[1], lift), /effort 8\/10/);
});

test("history ignores unfinished and zero-rep sets without treating missing effort as a score", () => {
  const old = record(); old.logs[0] = [{ reps: 0, weight: 99, done: true }, { reps: 8, weight: 45, done: true }, { reps: 20, weight: 200, done: false }];
  const points = exerciseSeries([old], lift);
  assert.equal(points[0].sets.length, 1);
  assert.equal(points[0].top.weight, 45);
  assert.equal("rpe" in points[0].top, false);
});

test("trim preserves every logged index, including sparse later rows and bodyweight logs", () => {
  const session = createSession(plan(), "active", 1000);
  session.logs[0][2] = { reps: 5, weight: 40, done: true, rpe: 7.5 };
  session.logs[1][0] = { reps: 10, weight: 0, done: true };
  const original = structuredClone(session);
  const next = shortenSession(session, "trim");
  assert.equal(next.plan.exercises[0].sets, 3);
  assert.deepEqual(next.logs[0][2], original.logs[0][2]);
  assert.equal(next.plan.exercises[1].sets, 2);
  assert.deepEqual(next.logs[1][0], original.logs[1][0]);
  assert.deepEqual(session, original);
});

test("main-only removes unstarted accessories but retains any completed accessory work", () => {
  const session = createSession(plan(), "active", 1000);
  assert.equal(shortenSession(session, "main").plan.exercises.length, 1);
  session.logs[1][2] = { reps: 12, weight: 0, done: true };
  const next = shortenSession(session, "main");
  assert.equal(next.plan.exercises.length, 2);
  assert.deepEqual(next.logs[1][2], session.logs[1][2]);
});

test("logging cannot overwrite a completed set while rest is pending", () => {
  let session = advanceSession(createSession(plan(), "active", 1000));
  session = logSet(session, { reps: 10, weight: 40, done: true, rpe: 8 });
  assert.equal(session.resting, true);
  assert.equal(logSet(session, { reps: 1, weight: 1, done: true }), session);
  session = advanceSession(session);
  assert.equal(session.setIdx, 1);
  assert.deepEqual(session.logs[0][0], { reps: 10, weight: 40, done: true, rpe: 8 });
});

test("shortening during rest cancels the old rest position and finds the next open set", () => {
  let session = advanceSession(createSession(plan(), "active", 1000));
  session = logSet(session, { reps: 10, weight: 40, done: true });
  const next = shortenSession(session, "trim");
  assert.equal(next.resting, false);
  assert.equal(next.exerciseIdx, 0);
  assert.equal(next.setIdx, 1);
  assert.equal(next.plan.exercises[0].sets, 2);
});

test("ending early retains the full plan and all logged sets under a stable session ID", () => {
  const session = createSession(plan(), "one-id", 1000);
  session.logs[0][0] = { reps: 10, weight: 40, done: true };
  const ended = finishRecord({ ...session, endedEarly: true }, 61000);
  assert.equal(ended.id, session.id);
  assert.deepEqual(ended.logs, session.logs);
  assert.deepEqual(ended.plan, session.plan);
  assert.equal(ended.endedEarly, true);
});

test("pause/resume excludes time away while old records keep their original duration", () => {
  let session = createSession(plan(), "active", 1000);
  session = pauseSession(session, 61000);
  assert.equal(pauseSession(session, 70000), session);
  session = resumeSession(session, 121000);
  const ended = finishRecord(session, 181000);
  assert.equal(ended.activeMs, 120000);
  assert.equal(durationMs(ended), 120000);
  assert.equal(durationMs(record("old", 121000)), 120000);
});
