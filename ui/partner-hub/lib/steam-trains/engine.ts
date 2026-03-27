import { stepSteamParticles, emitSteamParticles } from "./particles";
import type {
  GameMode,
  LevelCheckpoint,
  LevelDefinition,
  SteamTrainsSimulationState,
  TrackSwitchState,
  TrainDefinition,
} from "./types";

const TRACK_Y = 320;

const clampDeltaMs = (dtMs: number) => Math.min(Math.max(dtMs, 0), 64);

const getSpeed = (train: TrainDefinition, level: LevelDefinition) => train.baseSpeed * level.baseSpeedMultiplier;

const createRunningState = (
  train: TrainDefinition,
  level: LevelDefinition,
  mode: GameMode,
  elapsedMs: number,
): SteamTrainsSimulationState => ({
  train: {
    definition: train,
    x: level.startX,
    y: TRACK_Y,
    speed: getSpeed(train, level),
    wheelRotationRad: 0,
  },
  level,
  mode,
  switchState: "main",
  checkpointDecisions: [],
  nextCheckpointIndex: 0,
  playState: "running",
  elapsedMs,
  crashAtMs: null,
  rewindStartMs: null,
  whistleAtMs: null,
  particles: [],
  nextParticleId: 1,
});

export const createSimulation = (
  train: TrainDefinition,
  level: LevelDefinition,
  mode: GameMode = "levels",
): SteamTrainsSimulationState => createRunningState(train, level, mode, 0);

export const setSwitchState = (
  state: SteamTrainsSimulationState,
  switchState: TrackSwitchState,
): SteamTrainsSimulationState => {
  if (state.playState !== "running") {
    return state;
  }

  return {
    ...state,
    switchState,
  };
};

export const triggerWhistle = (state: SteamTrainsSimulationState): SteamTrainsSimulationState => ({
  ...state,
  whistleAtMs: state.elapsedMs,
});

export const triggerSteamPuff = (state: SteamTrainsSimulationState): SteamTrainsSimulationState => {
  const emitter = state.train.definition.locomotive.steamEmitter;
  const emitted = emitSteamParticles(
    state.particles,
    emitter,
    state.train.x + emitter.offsetX,
    state.train.y + emitter.offsetY,
    220,
    "puff",
    state.nextParticleId,
  );

  return {
    ...state,
    particles: emitted.particles,
    nextParticleId: emitted.nextParticleId,
  };
};

export const restartSimulation = (
  state: SteamTrainsSimulationState,
  elapsedMs: number = state.elapsedMs,
): SteamTrainsSimulationState => createRunningState(state.train.definition, state.level, state.mode, elapsedMs);

const resolveCheckpoint = (
  state: SteamTrainsSimulationState,
  checkpoint: LevelCheckpoint,
  elapsedMs: number,
): SteamTrainsSimulationState => {
  const nextDecisions = [...state.checkpointDecisions, state.switchState];
  const isCorrect = state.switchState === checkpoint.safeBranch;

  if (state.mode === "levels" && !isCorrect) {
    return {
      ...state,
      playState: "crashed",
      crashAtMs: elapsedMs,
      nextCheckpointIndex: state.nextCheckpointIndex + 1,
      checkpointDecisions: nextDecisions,
      train: {
        ...state.train,
        x: checkpoint.x,
        speed: 0,
      },
    };
  }

  return {
    ...state,
    nextCheckpointIndex: state.nextCheckpointIndex + 1,
    checkpointDecisions: nextDecisions,
  };
};

const processRewind = (state: SteamTrainsSimulationState, elapsedMs: number) => {
  if (state.playState === "crashed" && state.crashAtMs !== null && elapsedMs - state.crashAtMs >= state.level.crashPauseMs) {
    return {
      ...state,
      playState: "rewinding" as const,
      rewindStartMs: elapsedMs,
      particles: [],
    };
  }

  if (state.playState === "rewinding" && state.rewindStartMs !== null) {
    const progress = (elapsedMs - state.rewindStartMs) / state.level.rewindDurationMs;
    if (progress >= 1) {
      return restartSimulation(state, elapsedMs);
    }

    const x = state.train.x - (state.train.x - state.level.startX) * Math.max(0.08, progress);
    return {
      ...state,
      train: {
        ...state.train,
        x,
      },
    };
  }

  return state;
};

export const advanceSimulation = (
  state: SteamTrainsSimulationState,
  dtInputMs: number,
): SteamTrainsSimulationState => {
  const dtMs = clampDeltaMs(dtInputMs);
  const elapsedMs = state.elapsedMs + dtMs;

  let nextState: SteamTrainsSimulationState = {
    ...state,
    elapsedMs,
    particles: stepSteamParticles(state.particles, dtMs),
  };

  const emitter = state.train.definition.locomotive.steamEmitter;
  const ambient = emitSteamParticles(
    nextState.particles,
    emitter,
    state.train.x + emitter.offsetX,
    state.train.y + emitter.offsetY,
    dtMs,
    "ambient",
    nextState.nextParticleId,
  );

  nextState = {
    ...nextState,
    particles: ambient.particles,
    nextParticleId: ambient.nextParticleId,
  };

  if (nextState.playState === "crashed" || nextState.playState === "rewinding") {
    return processRewind(nextState, elapsedMs);
  }

  if (nextState.playState === "completed") {
    if (nextState.mode === "free-play") {
      return restartSimulation(nextState, elapsedMs);
    }
    return nextState;
  }

  const movement = (nextState.train.speed * dtMs) / 1000;
  const wheelRadius = nextState.train.definition.locomotive.wheelSet.radius;
  const wheelRotationDelta = movement / Math.max(8, wheelRadius);
  const trainX = nextState.train.x + movement;

  let resolvedState: SteamTrainsSimulationState = {
    ...nextState,
    train: {
      ...nextState.train,
      x: trainX,
      wheelRotationRad: nextState.train.wheelRotationRad + wheelRotationDelta,
    },
  };

  while (resolvedState.nextCheckpointIndex < resolvedState.level.checkpoints.length) {
    const checkpoint = resolvedState.level.checkpoints[resolvedState.nextCheckpointIndex];
    if (resolvedState.train.x < checkpoint.x) {
      break;
    }

    resolvedState = resolveCheckpoint(resolvedState, checkpoint, elapsedMs);
    if (resolvedState.playState === "crashed") {
      return resolvedState;
    }
  }

  if (resolvedState.train.x >= resolvedState.level.destinationX) {
    if (resolvedState.mode === "free-play") {
      return restartSimulation(resolvedState, elapsedMs);
    }

    return {
      ...resolvedState,
      playState: "completed",
      train: {
        ...resolvedState.train,
        x: resolvedState.level.destinationX,
        speed: 0,
      },
    };
  }

  return resolvedState;
};
