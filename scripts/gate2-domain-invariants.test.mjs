import test from "node:test";
import assert from "node:assert/strict";
import {
  DRAW_CALL_BUDGET,
  FPS_DEGRADATION_FLOOR,
  MAX_PHYSICS_DELTA_MS,
  MIN_PHYSICS_DELTA_MS,
  SimulationTelemetryAggregate,
  SimulationWatchdog,
} from "../lib/domain/simulation-telemetry-engine.mjs";

test("Signal Atlas Gate 2: Pure Domain Invariants Suite", async (t) => {
  await t.test("Invariant 1: Draw call budget constant and FPS floor invariants are immutable", () => {
    assert.equal(DRAW_CALL_BUDGET, 250, "Draw call budget must strictly be 250");
    assert.equal(FPS_DEGRADATION_FLOOR, 30, "FPS degradation floor must strictly be 30");
    assert.equal(MAX_PHYSICS_DELTA_MS, 100, "Max physics delta must strictly be 100 ms");
    assert.equal(MIN_PHYSICS_DELTA_MS, 0, "Min physics delta must strictly be 0 ms");
  });

  await t.test("Invariant 2: Valid telemetry frame ingestion marks withinBudget correctly", () => {
    const frameUnder = SimulationTelemetryAggregate.validateAndIngestFrame({
      sceneId: "solar-system-3d",
      fps: 60,
      drawCalls: 120,
      deltaMs: 16.6,
      activeMeshes: 45,
    });
    assert.ok(frameUnder.frameId.startsWith("frame-"));
    assert.equal(frameUnder.withinBudget, true);

    const frameOver = SimulationTelemetryAggregate.validateAndIngestFrame({
      sceneId: "solar-system-3d",
      fps: 25,
      drawCalls: 320,
      deltaMs: 40.0,
      activeMeshes: 180,
    });
    assert.equal(frameOver.withinBudget, false);
  });

  await t.test("Invariant 3: Poka-Yoke rejects physics step delta outside (0, 100] ms", () => {
    assert.throws(
      () =>
        SimulationTelemetryAggregate.validateAndIngestFrame({
          sceneId: "solar-system-3d",
          fps: 15,
          drawCalls: 80,
          deltaMs: 250, // Exceeds 100ms
        }),
      /PhysicsStepDelta invariant violation/
    );

    assert.throws(
      () =>
        SimulationTelemetryAggregate.validateAndIngestFrame({
          sceneId: "solar-system-3d",
          fps: 60,
          drawCalls: 80,
          deltaMs: 0, // Zero
        }),
      /PhysicsStepDelta invariant violation/
    );

    assert.throws(
      () =>
        SimulationTelemetryAggregate.validateAndIngestFrame({
          sceneId: "solar-system-3d",
          fps: 60,
          drawCalls: 80,
          deltaMs: -10, // Negative
        }),
      /PhysicsStepDelta invariant violation/
    );
  });

  await t.test("Invariant 4: Watchdog flags frame degradation below 30 FPS floor", () => {
    const frames = [
      { frameId: "f-1", fps: 60, drawCalls: 100 },
      { frameId: "f-2", fps: 24, drawCalls: 150 },
    ];

    const result = SimulationWatchdog.evaluate(frames);
    assert.equal(result.degraded, true);
    assert.ok(result.alerts.some((a) => a.includes("dropped below 30 FPS")));
  });

  await t.test("Invariant 5: Watchdog flags draw calls exceeding budget ceiling (250)", () => {
    const frames = [
      { frameId: "f-3", fps: 55, drawCalls: 310 },
    ];

    const result = SimulationWatchdog.evaluate(frames);
    assert.equal(result.degraded, true);
    assert.ok(result.alerts.some((a) => a.includes("exceeded DrawCallBudget")));
  });
});
