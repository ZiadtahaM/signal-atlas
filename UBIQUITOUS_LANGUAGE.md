# Ubiquitous Language: Signal Atlas & 3D WebGL Simulation Engine

## Domain Concepts

### SimulationFrame
A single discrete step in the WebGL rendering and physics pipeline. Captures instantaneous framerate, draw call volume, active meshes, and frame delta time.

### DrawCallBudget
The non-negotiable performance ceiling for WebGL draw calls per frame (ceiling: 250 calls for smooth 60fps on mobile/integrated GPUs). Exceeding this budget triggers performance throttling warnings.

### PhysicsStepDelta
The fixed or clamped delta time in milliseconds (`deltaMs`) between physics updates. Must satisfy `0 < deltaMs <= 100` to prevent physics tunnel penetration, catastrophic drift, or NaN transforms.

### TelemetryWatchdog
An active watchdog evaluating real-time telemetry streams against degradation thresholds. Flags frame rate drops below 30 FPS or draw call spikes exceeding budget.

### TelemetryAppendLog
An append-only immutable Bitcask-style storage log recording valid telemetry packets on disk (`data/telemetry-log.json`).
