import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const DATA_DIR = path.resolve(ROOT_DIR, "data");
const STORE_PATH = path.resolve(DATA_DIR, "telemetry-log.json");
const SQLITE_PATH = path.resolve(DATA_DIR, "telemetry.sqlite");
const SCHEMA_PATH = path.resolve(ROOT_DIR, "schema.sql");

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
  static _db = null;

  static getDb() {
    if (!this._db) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      this._db = new DatabaseSync(SQLITE_PATH);
      this._db.exec("PRAGMA journal_mode = WAL;");
      this._db.exec("PRAGMA foreign_keys = ON;");

      if (fs.existsSync(SCHEMA_PATH)) {
        const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
        this._db.exec(schema);
      }

      this.seedIfEmpty(this._db);
    }
    return this._db;
  }

  static seedIfEmpty(db) {
    try {
      const sceneCount = db.prepare("SELECT COUNT(*) as cnt FROM scenes").get();
      if (!sceneCount || sceneCount.cnt === 0) {
        const sStmt = db.prepare("INSERT OR IGNORE INTO scenes (id, name) VALUES (?, ?)");
        sStmt.run("default-scene", "Default Telemetry Viewport");
        sStmt.run("solar-system-3d", "Solar System Orbital Simulation");
        sStmt.run("cold-chain-logistics", "Industrial Cold-Chain Fleet");
      }
    } catch (e) {
      console.warn("[SignalAtlas DB Seed Warning]", e.message);
    }
  }

  static getIdempotentResponse(key) {
    const db = this.getDb();
    const row = db.prepare("SELECT response_json FROM idempotency_keys WHERE key = ?").get(key);
    return row ? JSON.parse(row.response_json) : null;
  }

  static saveIdempotentResponse(key, endpoint, response) {
    const db = this.getDb();
    db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, endpoint, response_json)
      VALUES (?, ?, ?)
    `).run(key, endpoint, JSON.stringify(response));
  }

  static appendOutbox(eventType, payload) {
    const db = this.getDb();
    db.prepare(`
      INSERT INTO audit_outbox (event_type, payload_json)
      VALUES (?, ?)
    `).run(eventType, JSON.stringify(payload));
  }

  static appendAudit(aggregateType, aggregateId, eventType, payload) {
    const db = this.getDb();
    const last = db.prepare("SELECT signature_sha256 FROM audit_ledger ORDER BY id DESC LIMIT 1").get();
    const prevHash = last ? last.signature_sha256 : "0".repeat(64);
    const payloadStr = JSON.stringify(payload);
    const sig = crypto.createHash("sha256").update(prevHash + payloadStr).digest("hex");
    db.prepare(`
      INSERT INTO audit_ledger (aggregate_type, aggregate_id, event_type, payload_json, prev_hash, signature_sha256)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(aggregateType, aggregateId, eventType, payloadStr, prevHash, sig);
  }

  static appendFrame(frame) {
    const db = this.getDb();
    const sceneId = frame.sceneId || "default-scene";
    db.prepare("INSERT OR IGNORE INTO scenes (id, name) VALUES (?, ?)").run(sceneId, sceneId);

    db.prepare(`
      INSERT INTO telemetry_frames (frame_id, scene_id, fps, draw_calls, delta_ms, active_meshes, within_budget)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      frame.frameId,
      sceneId,
      frame.fps,
      frame.drawCalls,
      frame.deltaMs,
      frame.activeMeshes || 0,
      frame.withinBudget ? 1 : 0
    );

    this.appendOutbox("FRAME_INGESTED", frame);
    this.appendAudit("SIMULATION_FRAME", frame.frameId, "FRAME_INGESTED", frame);

    const store = this.load();
    store.frames = store.frames || [];
    store.frames.push(frame);
    this.save(store);
    return store;
  }

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
}
