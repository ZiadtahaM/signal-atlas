import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DRAW_CALL_BUDGET,
  FPS_DEGRADATION_FLOOR,
  MAX_PHYSICS_DELTA_MS,
  SimulationTelemetryAggregate,
  SimulationWatchdog,
  TelemetryStore,
} from "../lib/domain/simulation-telemetry-engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Invariant 1: Valid telemetry frame ingestion enforces draw call budget", () => {
  const frame = SimulationTelemetryAggregate.validateAndIngestFrame({
    sceneId: "solar-system-3d",
    fps: 60,
    drawCalls: 120,
    deltaMs: 16.6,
    activeMeshes: 45,
  });

  assert.ok(frame.frameId.startsWith("frame-"));
  assert.equal(frame.fps, 60);
  assert.equal(frame.drawCalls, 120);
  assert.equal(frame.withinBudget, true);
});

test("Invariant 2: Poka-Yoke rejects physics step delta outside (0, 100] ms", () => {
  assert.throws(
    () =>
      SimulationTelemetryAggregate.validateAndIngestFrame({
        sceneId: "solar-system-3d",
        fps: 15,
        drawCalls: 80,
        deltaMs: 250, // Exceeds 100ms
        activeMeshes: 45,
      }),
    /PhysicsStepDelta invariant violation/
  );

  assert.throws(
    () =>
      SimulationTelemetryAggregate.validateAndIngestFrame({
        sceneId: "solar-system-3d",
        fps: 60,
        drawCalls: 80,
        deltaMs: -5, // Negative
        activeMeshes: 45,
      }),
    /PhysicsStepDelta invariant violation/
  );
});

test("Invariant 3: Watchdog flags frame degradation below 30 FPS floor", () => {
  const frames = [
    { frameId: "f-1", fps: 60, drawCalls: 100 },
    { frameId: "f-2", fps: 22, drawCalls: 150 }, // Degraded FPS
  ];

  const result = SimulationWatchdog.evaluate(frames);
  assert.equal(result.degraded, true);
  assert.ok(result.alerts.some((a) => a.includes("dropped below 30 FPS")));
});

test("Invariant 4: Watchdog flags draw calls exceeding budget ceiling (250)", () => {
  const frames = [
    { frameId: "f-3", fps: 55, drawCalls: 310 }, // Exceeds 250
  ];

  const result = SimulationWatchdog.evaluate(frames);
  assert.equal(result.degraded, true);
  assert.ok(result.alerts.some((a) => a.includes("exceeded DrawCallBudget")));
});

test("Invariant 5: Telemetry persistence store appends and reloads frames", () => {
  const frame = SimulationTelemetryAggregate.validateAndIngestFrame({
    sceneId: "test-scene",
    fps: 50,
    drawCalls: 180,
    deltaMs: 20.0,
    activeMeshes: 30,
  });

  const store = TelemetryStore.load();
  const initialCount = store.frames.length;
  TelemetryStore.appendFrame(frame);

  const reloaded = TelemetryStore.load();
  assert.equal(reloaded.frames.length, initialCount + 1);
  assert.equal(reloaded.frames[reloaded.frames.length - 1].frameId, frame.frameId);
});

test("Invariant 6: Ubiquitous Language contract file contains essential simulation invariants", async () => {
  const docPath = path.resolve(__dirname, "../UBIQUITOUS_LANGUAGE.md");
  const content = await fs.readFile(docPath, "utf-8");
  assert.ok(content.length > 100);
  assert.match(content, /SimulationFrame/);
  assert.match(content, /DrawCallBudget/);
  assert.match(content, /PhysicsStepDelta/);
});
