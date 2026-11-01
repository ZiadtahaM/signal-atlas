import sqlite3
import sys
import os
import uuid

db_path = os.path.join(os.path.dirname(__file__), "..", "data", "telemetry.sqlite")
schema_path = os.path.join(os.path.dirname(__file__), "..", "schema.sql")

os.makedirs(os.path.dirname(db_path), exist_ok=True)
con = sqlite3.connect(db_path)
con.execute("PRAGMA foreign_keys = ON;")

if os.path.exists(schema_path):
    with open(schema_path, "r", encoding="utf-8") as f:
        con.executescript(f.read())

# Ensure canonical seeds exist
scene_count = con.execute("SELECT COUNT(*) FROM scenes").fetchone()[0]
if scene_count == 0:
    scenes = [
        ("default-scene", "Default Telemetry Viewport"),
        ("solar-system-3d", "Solar System Orbital Simulation"),
        ("cold-chain-logistics", "Industrial Cold-Chain Fleet")
    ]
    con.executemany("INSERT OR IGNORE INTO scenes (id, name) VALUES (?, ?)", scenes)
con.commit()

passed = 0
failed = 0

print("=== SIGNAL ATLAS: GATE 1 RAW SQLITE SABOTAGE TEST ===")

# --- TEST 1: delta_ms out of bounds (> 100ms) CHECK Constraint Sabotage ---
print("\n[TEST 1] Attempting to insert delta_ms = 250 into telemetry_frames...")
try:
    con.execute("""
        INSERT INTO telemetry_frames (frame_id, scene_id, fps, draw_calls, delta_ms, active_meshes, within_budget)
        VALUES ('frame-sabotage-delta', 'default-scene', 15, 120, 250.0, 40, 1)
    """)
    con.commit()
    print("FAILED: delta_ms = 250 was accepted! CHECK constraint failed.")
    failed += 1
except sqlite3.IntegrityError as e:
    print(f"PASSED: SQLite engine rejected insertion as expected: {e}")
    passed += 1

# --- TEST 2: within_budget NOT IN (0, 1) CHECK Constraint Sabotage ---
print("\n[TEST 2] Attempting to insert invalid within_budget = 5 into telemetry_frames...")
try:
    con.execute("""
        INSERT INTO telemetry_frames (frame_id, scene_id, fps, draw_calls, delta_ms, active_meshes, within_budget)
        VALUES ('frame-sabotage-budget', 'default-scene', 60, 120, 16.6, 40, 5)
    """)
    con.commit()
    print("FAILED: within_budget = 5 was accepted! CHECK constraint failed.")
    failed += 1
except sqlite3.IntegrityError as e:
    print(f"PASSED: SQLite engine rejected insertion as expected: {e}")
    passed += 1

# --- TEST 3: Foreign Key Constraint Sabotage (Non-existent scene_id) ---
print("\n[TEST 3] Attempting to insert orphan telemetry frame referencing non-existent scene...")
try:
    con.execute("""
        INSERT INTO telemetry_frames (frame_id, scene_id, fps, draw_calls, delta_ms, active_meshes, within_budget)
        VALUES ('frame-sabotage-orphan', 'non-existent-scene-xyz', 60, 100, 16.6, 30, 1)
    """)
    con.commit()
    print("FAILED: Orphan frame was accepted! Foreign key constraint failed.")
    failed += 1
except sqlite3.IntegrityError as e:
    print(f"PASSED: SQLite engine rejected insertion as expected: {e}")
    passed += 1

# Unique IDs for trigger tests
test_run_id = uuid.uuid4().hex[:8]
frame_id = f"frame-sabotage-{test_run_id}"
audit_id = f"audit-sabotage-{test_run_id}"

# --- TEST 4: Append-Only Trigger Sabotage (DELETE Blocked on telemetry_frames) ---
print("\n[TEST 4] Inserting valid telemetry frame, then attempting DELETE...")
con.execute("""
    INSERT INTO telemetry_frames (frame_id, scene_id, fps, draw_calls, delta_ms, active_meshes, within_budget)
    VALUES (?, 'default-scene', 60, 120, 16.6, 40, 1)
""", (frame_id,))
con.commit()

try:
    con.execute("DELETE FROM telemetry_frames WHERE frame_id = ?", (frame_id,))
    con.commit()
    print("FAILED: Telemetry frame was deleted! Immutability trigger failed.")
    failed += 1
except sqlite3.DatabaseError as e:
    if "TELEMETRY_FRAME_IMMUTABLE" in str(e):
        print(f"PASSED: SQLite BEFORE DELETE trigger successfully blocked frame deletion: {e}")
        passed += 1
    else:
        print(f"FAILED: Unexpected error: {e}")
        failed += 1

# --- TEST 5: Append-Only Trigger Sabotage (DELETE Blocked on audit_ledger) ---
print("\n[TEST 5] Inserting valid audit record, then attempting DELETE...")
con.execute("""
    INSERT INTO audit_ledger (aggregate_type, aggregate_id, event_type, payload_json, prev_hash, signature_sha256)
    VALUES ('TELEMETRY', ?, 'TEST_AUDIT', '{"test": true}', '0000000000000000000000000000000000000000000000000000000000000000', 'mock_hash')
""", (audit_id,))
con.commit()

row = con.execute("SELECT id FROM audit_ledger WHERE aggregate_id = ?", (audit_id,)).fetchone()
inserted_audit_pk = row[0]

try:
    con.execute("DELETE FROM audit_ledger WHERE id = ?", (inserted_audit_pk,))
    con.commit()
    print("FAILED: Audit record was deleted! Immutability trigger failed.")
    failed += 1
except sqlite3.DatabaseError as e:
    if "AUDIT_LEDGER_IMMUTABLE" in str(e):
        print(f"PASSED: SQLite BEFORE DELETE trigger successfully blocked audit deletion: {e}")
        passed += 1
    else:
        print(f"FAILED: Unexpected error: {e}")
        failed += 1

con.close()

print(f"\nGate 1 Verification Summary: {passed} PASSED, {failed} FAILED.")
if failed > 0:
    sys.exit(1)
print("ALL GATE 1 SQLITE SABOTAGE PROOFS VERIFIED WITH EXIT CODE 0.")
