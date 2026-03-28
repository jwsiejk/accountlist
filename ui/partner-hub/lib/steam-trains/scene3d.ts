import type { SteamTrainsSimulationState, TrackSwitchState, TrainDefinition } from "./types";

export type CabTheme = {
  trimColor: string;
  bodyColor: string;
  handlingLabel: "Light" | "Medium" | "Heavy";
};

export type Scene3dCheckpointCue = {
  id: string;
  z: number;
  safeBranch: TrackSwitchState;
  promptText: string;
};

export type Scene3dStationCue = {
  startZ: number;
  endZ: number;
  completed: boolean;
  progressRatio: number;
};

export type Scene3dModel = {
  speedMph: number;
  nextRouteLabel: string;
  horizonDistance: number;
  checkpointCues: Scene3dCheckpointCue[];
  stationCue: Scene3dStationCue | null;
};

const HUD_HORIZON_DISTANCE = 460;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const toForwardZ = (trainX: number, worldX: number) => worldX - trainX;

export const buildCabTheme = (train: TrainDefinition): CabTheme => {
  const haulingClass = train.rollingStock.length + (train.tender ? 1 : 0);
  const handlingLabel = haulingClass >= 3 ? "Heavy" : haulingClass >= 1 ? "Medium" : "Light";

  return {
    trimColor: train.locomotive.trimColor,
    bodyColor: train.locomotive.color,
    handlingLabel,
  };
};

export const buildScene3dModel = (state: SteamTrainsSimulationState): Scene3dModel => {
  const nextCheckpoint = state.level.checkpoints[state.nextCheckpointIndex];
  const nextRouteLabel = nextCheckpoint
    ? `${nextCheckpoint.safeBranch === "main" ? "Top track" : "Side track"} (${Math.max(
        0,
        Math.round(nextCheckpoint.x - state.train.x),
      )}m)`
    : "Keep going";

  const checkpointCues = state.level.checkpoints
    .slice(state.nextCheckpointIndex)
    .map((checkpoint) => ({
      id: checkpoint.id,
      z: toForwardZ(state.train.x, checkpoint.x),
      safeBranch: checkpoint.safeBranch,
      promptText: checkpoint.promptText ?? "Track choice ahead",
    }))
    .filter((checkpoint) => checkpoint.z >= -80 && checkpoint.z <= HUD_HORIZON_DISTANCE);

  const station = state.level.stationStop;
  const stationCue = station
    ? {
        startZ: toForwardZ(state.train.x, station.startX),
        endZ: toForwardZ(state.train.x, station.endX),
        completed: state.stationStopCompleted,
        progressRatio: clamp01(state.stationStopProgressMs / station.requiredStopMs),
      }
    : null;

  return {
    speedMph: Math.max(0, Math.round(state.train.speed * 0.62)),
    nextRouteLabel,
    horizonDistance: HUD_HORIZON_DISTANCE,
    checkpointCues,
    stationCue,
  };
};
