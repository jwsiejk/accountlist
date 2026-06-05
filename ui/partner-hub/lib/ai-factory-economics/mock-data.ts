import type { AiFactoryEconomicsMockDashboard } from "./types";

export const aiFactoryEconomicsMockDashboard: AiFactoryEconomicsMockDashboard =
  {
    scenarioName: "Local workstation inference economics demo",
    summary:
      "A Phase 7 dashboard that keeps demo/mock economics visible while measuring local Ollama runtime, estimating tokens, deriving model comparison, and presenting safe local-only recommendations.",
    assumptions: [
      {
        id: "energy-rate",
        label: "Energy rate assumption",
        value: "$0.16/kWh",
        classification: "Configured",
        description:
          "Static display assumption only; not used by a live collector or Phase 7 recommendation.",
        tone: "info",
      },
      {
        id: "demo-mode",
        label: "Demo mode",
        value: "On",
        classification: "Configured",
        description:
          "Phase 7 renders demo/mock economics plus local Ollama health, model discovery, prompt streaming, measured timing, estimated token counts, derived throughput/comparison, safe recommendations, and optional NVIDIA GPU snapshots.",
        tone: "good",
      },
    ],
    metrics: [
      {
        id: "selected-model",
        label: "Selected model",
        value: "llama3.1:8b-instruct",
        classification: "Demo/mock",
        description:
          "Placeholder model name for demo fallback; discovered local Ollama models and prompt streams are shown separately as Measured/Estimated/Derived in Phase 7.",
        tone: "info",
      },
      {
        id: "ttft",
        label: "Time to first token",
        value: "420 ms",
        classification: "Demo/mock",
        description:
          "Mock first-token timing for the dashboard shell; Phase 7 measures TTFT in the prompt runner while this card remains demo/mock.",
        tone: "good",
      },
      {
        id: "total-latency",
        label: "Total latency",
        value: "2.8 s",
        classification: "Demo/mock",
        description:
          "Mock end-to-end economics placeholder; Phase 7 measures total latency in the prompt runner while this card remains demo/mock.",
        tone: "good",
      },
      {
        id: "tokens-sec",
        label: "Estimated tokens/sec",
        value: "31.4 tok/s",
        classification: "Demo/mock",
        description:
          "Mock dashboard throughput preview; the Phase 7 prompt runner separately derives tokens/sec from measured generation duration and estimated response tokens.",
        tone: "info",
      },
      {
        id: "gpu-utilization",
        label: "GPU utilization",
        value: "68%",
        classification: "Demo/mock",
        description:
          "Mock GPU utilization; Phase 7 samples nvidia-smi in a separate live panel; this static dashboard card remains demo/mock.",
        tone: "info",
      },
      {
        id: "gpu-memory",
        label: "GPU memory",
        value: "4.8 / 6 GB",
        classification: "Demo/mock",
        description:
          "Mock memory pressure preview aligned to the local 6 GB laptop GPU demo target until live telemetry replaces it.",
        tone: "info",
      },
      {
        id: "gpu-watts",
        label: "GPU watts",
        value: "146 W",
        classification: "Demo/mock",
        description:
          "Mock power draw; the live GPU panel remains snapshot-only and is not exact per-run attribution in Phase 7.",
        tone: "warning",
      },
      {
        id: "gpu-temperature",
        label: "GPU temperature",
        value: "62°C",
        classification: "Demo/mock",
        description:
          "Mock thermal signal for the separate local NVIDIA snapshot panel.",
        tone: "info",
      },
      {
        id: "tokens-per-watt",
        label: "Estimated tokens per watt",
        value: "0.22 tok/W",
        classification: "Demo/mock",
        description:
          "Mock efficiency preview; later phases will explain whether watts are sampled, measured, or unavailable.",
        tone: "good",
      },
      {
        id: "cost-per-run",
        label: "Estimated cost per run",
        value: "$0.000018",
        classification: "Demo/mock",
        description:
          "Mock economics preview using a static energy-rate assumption; no persisted cost model exists in Phase 7.",
        tone: "good",
      },
    ],
    readiness: [
      {
        title: "Ollama",
        status: "Checked",
        classification: "Measured",
        description:
          "Phase 7 checks local Ollama health, discovers /api/tags models, runs local prompt streams, displays timing/token metrics, and keeps graceful fallback when unavailable.",
      },
      {
        title: "NVIDIA telemetry",
        status: "Checked",
        classification: "Measured",
        description:
          "Phase 7 keeps local NVIDIA telemetry as optional nvidia-smi snapshots and shows safe unavailable states otherwise.",
      },
      {
        title: "Run history",
        status: "Checked",
        classification: "Derived",
        description:
          "Phase 7 keeps sanitized run summaries in browser memory only and derives model comparisons/recommendations without prompt/response persistence.",
      },
    ],
    phases: [
      {
        phase: "Phase 1",
        title: "Static shell",
        status: "Complete",
        description:
          "Dashboard shell, local-only copy, mock metrics, readiness guidance, and documentation updates.",
      },
      {
        phase: "Phase 2",
        title: "Ollama health/model discovery",
        status: "Complete",
        description:
          "Local health checks and model list discovery while retaining demo fallback behavior.",
      },
      {
        phase: "Phase 3",
        title: "Prompt runner",
        status: "Complete",
        description:
          "Run local Ollama prompts and stream responses without persisting prompt or response content.",
      },
      {
        phase: "Phase 4",
        title: "Run timing and response efficiency",
        status: "Complete",
        description:
          "Measure TTFT, total latency, and generation duration; estimate prompt/response tokens; derive tokens/sec without persistence.",
      },
      {
        phase: "Phase 5",
        title: "NVIDIA telemetry",
        status: "Complete",
        description:
          "Sample local GPU utilization, memory, watts, and temperature when nvidia-smi is available; no persistence or per-process attribution.",
      },
      {
        phase: "Phase 6",
        title: "In-memory history and comparison",
        status: "Complete",
        description:
          "Record sanitized browser-memory run summaries and derive per-model comparison aggregates without prompt or response persistence.",
      },
      {
        phase: "Phase 7",
        title: "Executive insights and recommendations",
        status: "Active",
        description:
          "Add executive scorecards, safe Derived recommendations, and Configured caveats from current local in-memory summaries only.",
        active: true,
      },
    ],
  };
