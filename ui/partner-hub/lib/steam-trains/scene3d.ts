import type { SteamTrainsSimulationState, TrackSwitchState, TrainDefinition } from "./types";

export type CabTheme = {
  trimColor: string;
  bodyColor: string;
  handlingLabel: "Light" | "Medium" | "Heavy";
  dashColor: string;
  sillColor: string;
  noseColor: string;
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

export type Scene3dTrackPreview = {
  id: string;
  splitZ: number;
  endZ: number;
  branchOffset: number;
  safeBranch: TrackSwitchState;
  promptText: string;
};

export type Scene3dLandmarkCue = {
  id: string;
  type: "station" | "bridge" | "tunnel";
  z: number;
  length: number;
  side: "left" | "right";
};

export type Scene3dRepeater = {
  id: string;
  kind: "sleeper" | "pole" | "tree";
  x: number;
  z: number;
  scale: number;
};

export type Scene3dModel = {
  speedMph: number;
  nextRouteLabel: string;
  horizonDistance: number;
  worldMotion: number;
  checkpointCues: Scene3dCheckpointCue[];
  routePreviews: Scene3dTrackPreview[];
  stationCue: Scene3dStationCue | null;
  landmarks: Scene3dLandmarkCue[];
  repeaters: Scene3dRepeater[];
};

const HUD_HORIZON_DISTANCE = 460;
const WORLD_NEAR_Z = -95;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const toForwardZ = (trainX: number, worldX: number) => worldX - trainX;

const repeatForwardZ = (offset: number, spacing: number) => {
  const wrapped = ((offset % spacing) + spacing) % spacing;
  return WORLD_NEAR_Z + wrapped;
};

const toHex = (value: number) => value.toString(16).padStart(2, "0");

const tintHex = (hex: string, factor: number) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) {
    return hex;
  }

  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel * factor)));
  const r = clamp(Number.parseInt(clean.slice(0, 2), 16));
  const g = clamp(Number.parseInt(clean.slice(2, 4), 16));
  const b = clamp(Number.parseInt(clean.slice(4, 6), 16));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const buildCabTheme = (train: TrainDefinition): CabTheme => {
  const haulingClass = train.rollingStock.length + (train.tender ? 1 : 0);
  const handlingLabel = haulingClass >= 3 ? "Heavy" : haulingClass >= 1 ? "Medium" : "Light";

  return {
    trimColor: train.locomotive.trimColor,
    bodyColor: train.locomotive.color,
    handlingLabel,
    dashColor: tintHex(train.locomotive.trimColor, 0.7),
    sillColor: tintHex(train.locomotive.color, 0.55),
    noseColor: tintHex(train.locomotive.color, 0.82),
  };
};

const buildRepeaters = (state: SteamTrainsSimulationState): Scene3dRepeater[] => {
  const motion = state.train.x - state.level.startX;

  const sleepers = Array.from({ length: 56 }, (_, index) => ({
    id: `sleeper-${index}`,
    kind: "sleeper" as const,
    x: 0,
    z: repeatForwardZ(motion + index * 7.8, 7.8),
    scale: 1,
  }));

  const poles = Array.from({ length: 22 }, (_, index) => ({
    id: `pole-${index}`,
    kind: "pole" as const,
    x: -10.8,
    z: repeatForwardZ(motion * 0.92 + index * 23, 23),
    scale: 1,
  }));

  const trees = Array.from({ length: 30 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const laneOffset = 16 + (index % 5) * 2.2;
    return {
      id: `tree-${index}`,
      kind: "tree" as const,
      x: side * laneOffset,
      z: repeatForwardZ(motion * 0.84 + index * 18, 18),
      scale: 0.85 + (index % 4) * 0.14,
    };
  });

  return [...sleepers, ...poles, ...trees];
};

const buildRoutePreviews = (state: SteamTrainsSimulationState): Scene3dTrackPreview[] =>
  state.level.checkpoints
    .slice(state.nextCheckpointIndex)
    .map((checkpoint) => {
      const splitZ = toForwardZ(state.train.x, checkpoint.x);
      const branchOffset = checkpoint.safeBranch === "main" ? -4.8 : 4.8;
      return {
        id: checkpoint.id,
        splitZ,
        endZ: splitZ + state.level.forkLength,
        branchOffset,
        safeBranch: checkpoint.safeBranch,
        promptText: checkpoint.promptText ?? "Track choice ahead",
      };
    })
    .filter((preview) => preview.endZ >= WORLD_NEAR_Z && preview.splitZ <= HUD_HORIZON_DISTANCE);

const buildLandmarks = (state: SteamTrainsSimulationState): Scene3dLandmarkCue[] => {
  const landmarks: Scene3dLandmarkCue[] = [];

  if (state.level.stationStop) {
    landmarks.push({
      id: "station-platform",
      type: "station",
      z: toForwardZ(state.train.x, state.level.stationStop.startX),
      length: Math.max(26, state.level.stationStop.endX - state.level.stationStop.startX),
      side: "left",
    });
  }

  const iconType = (icon: string | undefined): Scene3dLandmarkCue["type"] | null => {
    if (icon === "bridge") return "bridge";
    if (icon === "tunnel") return "tunnel";
    if (icon === "station") return "station";
    return null;
  };

  state.level.checkpoints.slice(state.nextCheckpointIndex).forEach((checkpoint, index) => {
    const type = iconType(checkpoint.promptIcon);
    if (!type) {
      return;
    }

    landmarks.push({
      id: `${checkpoint.id}-${type}`,
      type,
      z: toForwardZ(state.train.x, checkpoint.x + 18 + index * 6),
      length: type === "bridge" ? 34 : type === "tunnel" ? 26 : 22,
      side: type === "bridge" ? "right" : "left",
    });
  });

  return landmarks.filter((landmark) => landmark.z + landmark.length >= WORLD_NEAR_Z && landmark.z <= HUD_HORIZON_DISTANCE);
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
    .filter((checkpoint) => checkpoint.z >= WORLD_NEAR_Z && checkpoint.z <= HUD_HORIZON_DISTANCE);

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
    worldMotion: state.train.x - state.level.startX,
    checkpointCues,
    routePreviews: buildRoutePreviews(state),
    stationCue,
    landmarks: buildLandmarks(state),
    repeaters: buildRepeaters(state),
  };
};
