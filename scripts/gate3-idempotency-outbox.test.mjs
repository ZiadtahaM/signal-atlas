import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../data/telemetry.sqlite");

describe("Signal Atlas Gate 3: Stateful API, Idempotency & Outbox Suite", () => {
  let baseUrl;
  let serverInstance = null;
  const idempotencyKey = `idem_frame_${Date.now()}`;

  before(async () => {
    try {
      const probe = await fetch("http://127.0.0.1:8099/health");
      if (probe.ok) {
        baseUrl = "http://127.0.0.1:8099";
        return;
      }
    } catch {
      // background server not up; spin up test server
    }

    process.env.NODE_ENV = "test";
    const mod = await import("../server-telemetry.mjs");
    serverInstance = mod.server;
    await new Promise((resolve) => {
      serverInstance.listen(0, "127.0.0.1", () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance && serverInstance.listening) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  let initialResponseJson;
  let createdFrameId;

  test("POST 1: Initial telemetry frame ingestion with Idempotency-Key writes to SQLite and outbox", async () => {
    const payload = {
      sceneId: "solar-system-3d",
      fps: 60,
      drawCalls: 110,
      deltaMs: 16.6,
      activeMeshes: 45,
    };

    const res = await fetch(`${baseUrl}/api/telemetry/frames`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201, "First frame ingestion POST must succeed with 201 Created");
    initialResponseJson = await res.json();
    assert.ok(initialResponseJson.frameId, "Must return frameId");
    createdFrameId = initialResponseJson.frameId;

    // Verify physical SQLite row persistence
    const db = new DatabaseSync(dbPath);
    const frameRow = db.prepare("SELECT * FROM telemetry_frames WHERE frame_id = ?").get(createdFrameId);
    assert.ok(frameRow, "Telemetry frame must physically exist in SQLite telemetry_frames table");
    assert.equal(frameRow.scene_id, "solar-system-3d");
    assert.equal(frameRow.fps, 60);
    assert.equal(frameRow.draw_calls, 110);
    assert.equal(frameRow.within_budget, 1);

    // Verify idempotency cache in SQLite
    const idemRow = db.prepare("SELECT * FROM idempotency_keys WHERE key = ?").get(idempotencyKey);
    assert.ok(idemRow, "Idempotency key must be stored in SQLite idempotency_keys table");

    // Verify audit outbox row
    const outboxRows = db.prepare("SELECT * FROM audit_outbox WHERE event_type = ?").all("FRAME_INGESTED");
    assert.ok(outboxRows.length >= 1, "Audit outbox must contain FRAME_INGESTED event");
    db.close();
  });

  test("POST 2: Duplicate POST with identical Idempotency-Key returns cached response without duplicate side effects", async () => {
    const db = new DatabaseSync(dbPath);
    const countBefore = db.prepare("SELECT COUNT(*) as cnt FROM telemetry_frames WHERE frame_id = ?").get(createdFrameId).cnt;
    db.close();

    const payload = {
      sceneId: "solar-system-3d",
      fps: 60,
      drawCalls: 110,
      deltaMs: 16.6,
      activeMeshes: 45,
    };

    const res = await fetch(`${baseUrl}/api/telemetry/frames`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200, "Idempotent retry must return 200 OK");
    assert.equal(res.headers.get("x-cache"), "HIT-IDEMPOTENCY", "Response must carry X-Cache: HIT-IDEMPOTENCY");

    const duplicateResponseJson = await res.json();
    assert.deepEqual(duplicateResponseJson, initialResponseJson, "Payload must match initial response exactly");

    // Verify no duplicate rows were inserted
    const db2 = new DatabaseSync(dbPath);
    const countAfter = db2.prepare("SELECT COUNT(*) as cnt FROM telemetry_frames WHERE frame_id = ?").get(createdFrameId).cnt;
    db2.close();

    assert.equal(countAfter, countBefore, "Row count must remain exactly 1 after duplicate idempotent request");
  });
});
