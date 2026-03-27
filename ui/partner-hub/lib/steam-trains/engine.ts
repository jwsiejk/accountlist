import { stepSteamParticles, emitSteamParticles } from "./particles";
import type {
  LevelDefinition,
  SteamTrainsSimulationState,
  TrackSwitchState,
  TrainDefinition,
} from "./types";

const TRACK_Y = 320;

const clampDeltaMs = (dtMs: number) => Math.min(Math.max(dtMs, 0), 64);

const resolveTurnoutDecision = (
  state: SteamTrainsSimulationState,
  trainX: number,
): TrackSwitchState | null => {
  if (state.turnoutDecision) {
    return state.turnoutDecision;
  }
  if (trainX >= state.level.switchX) {
    return state.switchState;
  }
  return null;
};

export const createSimulation = (
  train: TrainDefinition,
  level: LevelDefinition,
): SteamTrainsSimulationState => ({
  train: {
    definition: train,
    x: level.startX,
    y: TRACK_Y,
    speed: train.baseSpeed,
    wheelRotationRad: 0,
  },
  level,
  switchState: "main",
  turnoutDecision: null,
  playState: "running",
  elapsedMs: 0,
  crashAtMs: null,
  whistleAtMs: null,
  particles: [],
  nextParticleId: 1,
});

export const setSwitchState = (
  state: SteamTrainsSimulationState,
  switchState: TrackSwitchState,
): SteamTrainsSimulationState => ({
  ...state,
  switchState,
});

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

export const restartAfterCrash = (state: SteamTrainsSimulationState): SteamTrainsSimulationState => ({
  ...createSimulation(state.train.definition, state.level),
  switchState: "main",
});

export const advanceSimulation = (
  state: SteamTrainsSimulationState,
  dtInputMs: number,
): SteamTrainsSimulationState => {
  const dtMs = clampDeltaMs(dtInputMs);
  const elapsedMs = state.elapsedMs + dtMs;

  if (
    state.playState === "crashed" &&
    state.crashAtMs !== null &&
    elapsedMs - state.crashAtMs >= state.level.crashResetDelayMs
  ) {
    return restartAfterCrash({
      ...state,
      elapsedMs,
      particles: stepSteamParticles(state.particles, dtMs),
    });
  }

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

  if (state.playState !== "running") {
    return nextState;
  }

  const movement = (state.train.speed * dtMs) / 1000;
  const wheelRadius = state.train.definition.locomotive.wheelSet.radius;
  const wheelRotationDelta = movement / Math.max(8, wheelRadius);
  const trainX = state.train.x + movement;
  const turnoutDecision = resolveTurnoutDecision(state, trainX);

  if (trainX >= state.level.switchX && turnoutDecision !== state.level.safeBranch) {
    return {
      ...nextState,
      playState: "crashed",
      crashAtMs: elapsedMs,
      turnoutDecision,
      train: {
        ...state.train,
        x: state.level.switchX,
        speed: 0,
        wheelRotationRad: state.train.wheelRotationRad + wheelRotationDelta * 0.4,
      },
    };
  }

  if (trainX >= state.level.destinationX) {
    return {
      ...nextState,
      playState: "completed",
      turnoutDecision,
      train: {
        ...state.train,
        x: state.level.destinationX,
        speed: 0,
        wheelRotationRad: state.train.wheelRotationRad + wheelRotationDelta,
      },
    };
  }

  return {
    ...nextState,
    turnoutDecision,
    train: {
      ...state.train,
      x: trainX,
      wheelRotationRad: state.train.wheelRotationRad + wheelRotationDelta,
    },
  };
};
