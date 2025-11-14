import {
  MIC_OUTCOME,
  logMic,
  emitMicBreadcrumb,
  normalizeErrorDetail,
  recordLastError,
  recordClientBannerEvent,
  logStage,
} from "./ws/telemetry.js";

// Mic + VAD state, breadcrumbs, and telemetry wiring

// function logMic(detail) { ... }
// function emitMicBreadcrumb(detail) { ... }
// function normalizeErrorDetail(detail) { ... }
// function recordLastError(error) { ... }
// function recordClientBannerEvent(detail) { ... }
// function logStage(detail) { ... }

// const MIC_OUTCOME = { ... };
