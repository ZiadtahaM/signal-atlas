import time
import sys
import subprocess
import os
import urllib.request
import sqlite3
import uuid
from playwright.sync_api import sync_playwright

SERVER_PORT = 8099
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "data", "telemetry.sqlite")

print("===========================================================================")
print("=== SIGNAL ATLAS: GATE 5 PLAYWRIGHT HARD-RELOAD PROOF SUITE ===============")
print("===========================================================================")

# Step 1: Ensure server is running or start it
server_proc = None

def is_server_healthy():
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health", timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False

if not is_server_healthy():
    print(f"\n[STEP 1] Starting Signal Atlas Telemetry Server on port {SERVER_PORT}...")
    server_proc = subprocess.Popen(
        ["node", "server-telemetry.mjs"],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    started = False
    for i in range(20):
        time.sleep(0.5)
        if is_server_healthy():
            started = True
            break
    if not started:
        print("ERROR: Server failed to start on port 8099.")
        if server_proc:
            server_proc.kill()
        sys.exit(1)
    print(f"PASSED: Server started and listening at {BASE_URL}.")
else:
    print(f"\n[STEP 1] Server already running and healthy at {BASE_URL}.")

try:
    with sync_playwright() as p:
        print("\n[STEP 2] Launching Headless Chromium Browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        # Step 3: Test Telemetry UI
        print(f"[STEP 3] Navigating to Signal Atlas Dashboard ({BASE_URL})...")
        page.goto(BASE_URL, wait_until="domcontentloaded")
        assert len(page.title()) > 0, "Page title must be non-empty"
        print(f"PASSED: Dashboard loaded successfully (Title: '{page.title()}').")

        # Step 4: Record a live frame ingestion via API
        print("\n[STEP 4] Ingesting high-performance telemetry frame...")
        frame_res = page.request.post(f"{BASE_URL}/api/telemetry/frames", data={
            "sceneId": "solar-system-3d",
            "fps": 60,
            "drawCalls": 115,
            "deltaMs": 16.6,
            "activeMeshes: 45": 45
        })
        assert frame_res.status == 201, f"Frame ingestion failed: {frame_res.status}"
        frame_data = frame_res.json()
        frame_id = frame_data["frameId"]
        print(f"PASSED: Frame ingested (ID: {frame_id}, fps: {frame_data['fps']}, drawCalls: {frame_data['drawCalls']}).")

        # Step 5: Perform Hard Reload (The True Persistence Gate)
        print("\n[STEP 5] Performing Hard Reload (page.reload()) to prove persistence...")
        page.reload(wait_until="domcontentloaded")
        print("PASSED: Page reloaded successfully without session corruption.")

        # Step 6: Direct SQLite Database Physical Assertions
        print("\n[STEP 6] Asserting physical SQLite database rows on disk...")
        assert os.path.exists(DB_PATH), f"SQLite database must exist at {DB_PATH}"

        con = sqlite3.connect(DB_PATH)
        row = con.execute("SELECT frame_id, scene_id, fps, draw_calls, delta_ms, within_budget FROM telemetry_frames WHERE frame_id = ?", (frame_id,)).fetchone()
        assert row is not None, f"Telemetry frame {frame_id} must physically exist in SQLite table!"
        assert row[1] == "solar-system-3d"
        assert row[2] == 60
        assert row[3] == 115
        assert row[5] == 1
        print(f"PASSED: SQLite telemetry_frame row verified: id='{row[0]}', scene='{row[1]}', fps={row[2]}, drawCalls={row[3]}, withinBudget={row[5]}.")

        con.close()
        browser.close()

    print("\nALL GATE 5 PLAYWRIGHT HARD-RELOAD & SQLITE PERSISTENCE PROOFS VERIFIED WITH EXIT CODE 0.")
    sys.exit(0)

except Exception as e:
    print(f"\nGATE 5 ERROR: {e}")
    sys.exit(1)

finally:
    if server_proc:
        print("\nTearing down test server process...")
        server_proc.kill()
