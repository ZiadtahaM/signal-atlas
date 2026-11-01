-- Signal Atlas: Gate 1 Relational Telemetry Schema
-- Enforces: Physics Step Delta Bounds, Strict Foreign Keys, Budget Checking, and Immutability Triggers
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telemetry_frames (
  frame_id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE RESTRICT,
  fps INTEGER NOT NULL CHECK (fps >= 0),
  draw_calls INTEGER NOT NULL CHECK (draw_calls >= 0),
  delta_ms REAL NOT NULL CHECK (delta_ms > 0 AND delta_ms <= 100),
  active_meshes INTEGER NOT NULL CHECK (active_meshes >= 0),
  within_budget INTEGER NOT NULL CHECK (within_budget IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sla_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  frame_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  dispatched INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  signature_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- BEFORE DELETE Triggers Enforcing Immutability
CREATE TRIGGER IF NOT EXISTS prevent_telemetry_delete
BEFORE DELETE ON telemetry_frames
BEGIN
  SELECT RAISE(ABORT, 'TELEMETRY_FRAME_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_delete
BEFORE DELETE ON audit_ledger
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_LEDGER_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS prevent_outbox_delete
BEFORE DELETE ON audit_outbox
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_OUTBOX_IMMUTABLE');
END;
