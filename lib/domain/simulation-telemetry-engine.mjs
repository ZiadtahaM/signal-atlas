import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.resolve(__dirname, "../../data/telemetry-log.json");

export const DRAW_CALL_BUDGET = 250;
export const FPS_DEGRADATION_FLOOR = 30;
export const MAX_PHYSICS_DELTA_MS = 100;
export const MIN_PHYSICS_DELTA_MS = 0;

export class SimulationTelemetryAggregate {
  static validateAndIngestFrame({ sceneId, fps, drawCalls, deltaMs, activeMeshes }) {
    const delta = Number(deltaMs);
    if (isNaN(delta) || delta <= MIN_PHYSICS_DELTA_MS || delta > MAX_PHYSICS_DELTA_MS) {
      throw new Error(`PhysicsStepDelta invariant violation: deltaMs (${deltaMs}) must be between 0 and 100 ms.`);
    }

    const frameFps = Number(fps);
    const frameDrawCalls = Number(drawCalls);
    const meshes = Number(activeMeshes || 0);

    return {
      frameId: `frame-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sceneId: sceneId || "default-scene",
      fps: frameFps,
      drawCalls: frameDrawCalls,
      deltaMs: delta,
      activeMeshes: meshes,
      withinBudget: frameDrawCalls <= DRAW_CALL_BUDGET,
      timestamp: new Date().toISOString()
    };
  }
}

export class SimulationWatchdog {
  static evaluate(frames = []) {
    const alerts = [];
    const recent = frames.slice(-10);

    for (const frame of recent) {
      if (frame.fps < FPS_DEGRADATION_FLOOR) {
        alerts.push(`Frame ${frame.frameId} dropped below ${FPS_DEGRADATION_FLOOR} FPS (observed: ${frame.fps} FPS).`);
      }
      if (frame.drawCalls > DRAW_CALL_BUDGET) {
        alerts.push(`Frame ${frame.frameId} exceeded DrawCallBudget of ${DRAW_CALL_BUDGET} (observed: ${frame.drawCalls}).`);
      }
    }

    return {
      degraded: alerts.length > 0,
      alerts,
      evaluatedFramesCount: recent.length,
      evaluatedAt: new Date().toISOString()
    };
  }
}

export class TelemetryStore {
  static load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
      }
    } catch {}
    return {
      version: 1,
      frames: []
    };
  }

  static save(store) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  }

  static appendFrame(frame) {
    const store = this.load();
    store.frames.push(frame);
    this.save(store);
    return store;
  }
}
