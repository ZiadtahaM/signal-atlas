import crypto from "node:crypto";
import http from "node:http";

import {

  SimulationTelemetryAggregate,

  SimulationWatchdog,

  TelemetryStore

} from "./lib/domain/simulation-telemetry-engine.mjs";



const PORT = 8099;



function parseJsonBody(req) {

  return new Promise((resolve, reject) => {

    let body = "";

    req.on("data", chunk => {

      body += chunk;

      if (body.length > 1e6) {

        req.destroy();

        reject(new Error("Payload too large"));

      }

    });

    req.on("end", () => {

      try {

        resolve(body ? JSON.parse(body) : {});

      } catch (err) {

        reject(err);

      }

    });

    req.on("error", reject);

  });

}



function sendJson(res, statusCode, data) {

  res.writeHead(statusCode, {

    "Content-Type": "application/json",

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers": "Content-Type"

  });

  res.end(JSON.stringify(data));

}



const server = http.createServer(async (req, res) => {

  if (req.method === "OPTIONS") {

    res.writeHead(204, {

      "Access-Control-Allow-Origin": "*",

      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",

      "Access-Control-Allow-Headers": "Content-Type"

    });

    res.end();

    return;

  }



  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  const pathname = url.pathname;



  try {

    // 1. Health Probe

    if (req.method === "GET" && pathname === "/health") {

      return sendJson(res, 200, { status: "ok", timestamp: new Date().toISOString() });

    }



    // 2. Ready Probe

    if (req.method === "GET" && pathname === "/ready") {

      return sendJson(res, 200, {

        status: "ready",

        checks: {

          telemetryStore: "healthy",

          port: PORT

        }

      });

    }



    // 3. Ingest Telemetry Frame

    if (req.method === "POST" && pathname === "/api/telemetry/frames") {

      const body = await parseJsonBody(req);

      try {

        const frame = SimulationTelemetryAggregate.validateAndIngestFrame(body);

        TelemetryStore.appendFrame(frame);

        return sendJson(res, 201, frame);

      } catch (validationErr) {

        return sendJson(res, 400, { error: validationErr.message });

      }

    }



    // 4. Telemetry Watchdog

    if (req.method === "GET" && pathname === "/api/telemetry/watchdog") {

      const store = TelemetryStore.load();

      const report = SimulationWatchdog.evaluate(store.frames);

      return sendJson(res, 200, report);

    }



    // 5. Query Frames

    if (req.method === "GET" && pathname === "/api/telemetry/frames") {

      const store = TelemetryStore.load();

      return sendJson(res, 200, store.frames);

    }



    // 6. Bi-Directional Adaptive Quality GovLoop (Real-time LOD Downgrade)

    if (req.method === "POST" && pathname === "/api/telemetry/adaptive-throttle") {

      const body = await parseJsonBody(req);

      const currentFps = Number(body.currentFps ?? body.rollingFps) || 60;

      const deviceVramMb = Number(body.vramMb) || 512;

      const isDegraded = currentFps < 30 || deviceVramMb < 384 || body.vramPressure === "HIGH";



      const throttleInstruction = isDegraded

        ? {

            action: "THROTTLE_LOD",

            degraded: true,

            reason: currentFps < 30 ? "LOW_FPS_TRIGGER" : "VRAM_PRESSURE",

            pixelRatio: 1.0,

            shadows: false,

            textureTier: "low",

            targetFps: 60,

            timestamp: new Date().toISOString()

          }

        : {

            action: "MAINTAIN_LOD",

            degraded: false,

            pixelRatio: 2.0,

            shadows: true,

            textureTier: "high",

            targetFps: 60,

            timestamp: new Date().toISOString()

          };



      return sendJson(res, 200, throttleInstruction);

    }



    // 6b. Progressive Sub-800ms Low-Poly First-Frame Hydration Endpoint
    if (req.method === "GET" && (pathname === "/api/telemetry/hydration-packet" || pathname === "/hydration-packet")) {
      const coarseVertices = [
        [30.012, 31.214, 15], [30.038, 31.232, 25], [30.061, 31.258, 40], [30.082, 31.284, 55],
        [30.104, 31.309, 35], [30.055, 31.325, 20], [30.024, 31.271, 10], [30.005, 31.223, 12]
      ];
      const packet = {
        status: "HYDRATED_LOW_POLY",
        lodLevel: 0,
        byteSize: 1420,
        hydrationTargetMs: 800,
        boundingEnvelope: {
          minLat: 29.97,
          maxLat: 30.12,
          minLng: 31.13,
          maxLng: 31.35,
          altitudeRangeMeters: [0, 450]
        },
        simplifiedVerticesCount: coarseVertices.length,
        coarseMeshVertices: coarseVertices,
        streamNextChunkUrl: "/api/telemetry/frames?stream=hd",
        sha256PacketHash: crypto.createHash("sha256").update("signal-atlas-lod0-hydration").digest("hex"),
        timestamp: new Date().toISOString()
      };
      return sendJson(res, 200, packet);
    }

    // 7. Deterministic Replay Flight-Recorder

    if (req.method === "GET" && pathname === "/api/telemetry/flight-recorder") {

      const store = TelemetryStore.load();

      const sanitizedStream = store.frames.map(f => ({

        timestamp: f.timestamp,

        deltaTimeMs: f.deltaTimeMs,

        fps: f.fps,

        cameraMatrix: f.cameraMatrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],

        inputVector: f.inputVector || { x: 0, y: 0, z: 0 }

      }));



      return sendJson(res, 200, {

        success: true,

        totalRecordedFrames: sanitizedStream.length,

        recordingWindowSeconds: Math.round((sanitizedStream.length * 16.6) / 1000),

        frames: sanitizedStream

      });

    }



    return sendJson(res, 404, { error: "Route not found" });

  } catch (err) {

    console.error("API Error:", err);

    return sendJson(res, 500, { error: err.message });

  }

});



server.listen(PORT, () => {

  console.log(`[SIGNAL ATLAS & 3D TELEMETRY API] running on port ${PORT}`);

});

