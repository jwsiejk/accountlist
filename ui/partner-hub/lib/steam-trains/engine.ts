import { stepSteamParticles, emitSteamParticles } from "./particles";
import { deriveTrainHandlingProfile } from "./trainCatalog";
import { countChuffPulses } from "./visuals";
import type {
  DriveCommand,
  GameMode,
  LevelCheckpoint,
  LevelDefinition,
  SteamTrainsSimulationState,
  TrackSwitchState,
  TrainDefinition,
} from "./types";

const TRACK_Y = 320;

const clampDeltaMs = (dtMs: number) => Math.min(Math.max(dtMs, 0), 64);

const getTargetSpeed = (state: SteamTrainsSimulationState): number => {
  const { driveCommand } = state;
  const { topSpeed, slowSpeed } = state.train.profile;
  const levelBoost = state.level.baseSpeedMultiplier;

  if (driveCommand === "stop") {
    return 0;
  }
  if (driveCommand === "slow") {
    return slowSpeed * levelBoost;
  }
  return topSpeed * levelBoost;
};

const getStatusText = (state: SteamTrainsSimulationState) => {
  if (state.playState === "crashed") {
    return "Gentle bump! Rewinding...";
  }
  if (state.playState === "rewinding") {
    return "Rolling back to try again";
  }
  if (state.playState === "completed") {
    return state.mode === "free-play" ? "Keep driving!" : "Level complete!";
  }

  if (state.level.stationStop && !state.stationStopCompleted) {
    const zone = state.level.stationStop;
    if (state.train.x < zone.startX - 36) {
      return "Get ready to stop at the station";
    }
    if (state.train.x >= zone.startX - 36 && state.train.x <= zone.endX + 18) {
      return "Stop in the station zone";
    }
  }

  const nextCheckpoint = state.level.checkpoints[state.nextCheckpointIndex];
  if (nextCheckpoint) {
    const remaining = nextCheckpoint.x - state.train.x;
    const warnDistance = nextCheckpoint.anticipationDistance ?? 150;
    if (remaining <= warnDistance) {
      return nextCheckpoint.promptText ?? "Track choice now";
    }
  }

  if (state.driveCommand === "stop") {
    return "Train stopped";
  }
  if (state.driveCommand === "slow") {
    return "Cruising slow";
  }
  return "Full steam ahead";
};

const createRunningState = (
  train: TrainDefinition,
  level: LevelDefinition,
  mode: GameMode,
  elapsedMs: number,
): SteamTrainsSimulationState => ({
  train: {
    definition: train,
    profile: deriveTrainHandlingProfile(train),
    x: level.startX,
    y: TRACK_Y,
    speed: 0,
    wheelRotationRad: 0,
  },
  level,
  mode,
  switchState: "main",
  checkpointDecisions: [],
  nextCheckpointIndex: 0,
  playState: "running",
  driveCommand: "go",
  elapsedMs,
  crashAtMs: null,
  rewindStartMs: null,
  whistleAtMs: null,
  particles: [],
  nextParticleId: 1,
  stationStopCompleted: false,
  stationStopProgressMs: 0,
  stationStopPerfect: false,
  crashedThisRun: false,
  statusText: "Tap GO to start moving",
});

export const createSimulation = (
  train: TrainDefinition,
  level: LevelDefinition,
  mode: GameMode = "levels",
): SteamTrainsSimulationState => createRunningState(train, level, mode, 0);

export const setDriveCommand = (
  state: SteamTrainsSimulationState,
  driveCommand: DriveCommand,
): SteamTrainsSimulationState => {
  if (state.playState !== "running") {
    return state;
  }
  return { ...state, driveCommand };
};

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
      crashedThisRun: true,
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

const stepSpeed = (speed: number, targetSpeed: number, dtMs: number, accel: number, brake: number, drag: number) => {
  const dtSeconds = dtMs / 1000;
  const difference = targetSpeed - speed;

  if (Math.abs(difference) < 0.001) {
    return targetSpeed;
  }

  if (difference > 0) {
    return Math.min(targetSpeed, speed + accel * dtSeconds);
  }

  const decel = (brake + drag) * dtSeconds;
  return Math.max(targetSpeed, speed - decel);
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
    return {
      ...processRewind(nextState, elapsedMs),
      statusText: getStatusText(nextState),
    };
  }

  if (nextState.playState === "completed") {
    if (nextState.mode === "free-play") {
      return restartSimulation(nextState, elapsedMs);
    }
    return { ...nextState, statusText: getStatusText(nextState) };
  }

  const targetSpeed = getTargetSpeed(nextState);
  const nextSpeed = stepSpeed(
    nextState.train.speed,
    targetSpeed,
    dtMs,
    nextState.train.profile.acceleration,
    nextState.train.profile.braking,
    nextState.train.profile.rollingDrag,
  );

  const movement = (nextSpeed * dtMs) / 1000;
  const wheelRadius = nextState.train.definition.locomotive.wheelSet.radius;
  const wheelRotationDelta = movement / Math.max(8, wheelRadius);
  const nextWheelRotationRad = nextState.train.wheelRotationRad + wheelRotationDelta;
  const trainX = nextState.train.x + movement;

  let resolvedState: SteamTrainsSimulationState = {
    ...nextState,
    train: {
      ...nextState.train,
      x: trainX,
      speed: nextSpeed,
      wheelRotationRad: nextWheelRotationRad,
    },
  };

  const stationStop = resolvedState.level.stationStop;
  if (stationStop && !resolvedState.stationStopCompleted) {
    const inZone = resolvedState.train.x >= stationStop.startX && resolvedState.train.x <= stationStop.endX;
    const stoppedInZone = inZone && resolvedState.train.speed <= stationStop.maxEntrySpeed;

    if (stoppedInZone) {
      const progress = resolvedState.stationStopProgressMs + dtMs;
      const complete = progress >= stationStop.requiredStopMs;
      resolvedState = {
        ...resolvedState,
        stationStopProgressMs: progress,
        stationStopCompleted: complete,
        stationStopPerfect: complete,
      };
    } else if (!inZone && resolvedState.stationStopProgressMs > 0 && resolvedState.mode === "levels") {
      resolvedState = {
        ...resolvedState,
        stationStopProgressMs: 0,
      };
    }

    if (
      resolvedState.mode === "levels" &&
      !resolvedState.stationStopCompleted &&
      resolvedState.train.x > stationStop.endX + 20
    ) {
      return {
        ...resolvedState,
        playState: "crashed",
        crashAtMs: elapsedMs,
        crashedThisRun: true,
        train: {
          ...resolvedState.train,
          speed: 0,
        },
        statusText: "Try stopping inside the station zone",
      };
    }
  }

  const chuffPulses = countChuffPulses(nextState.train.wheelRotationRad, nextWheelRotationRad);
  if (chuffPulses > 0) {
    let puffState = resolvedState;
    for (let pulse = 0; pulse < chuffPulses; pulse += 1) {
      const pulseCloud = emitSteamParticles(
        puffState.particles,
        emitter,
        puffState.train.x + emitter.offsetX + (Math.random() - 0.5) * 4,
        puffState.train.y + emitter.offsetY,
        120,
        "puff",
        puffState.nextParticleId,
      );
      puffState = {
        ...puffState,
        particles: pulseCloud.particles,
        nextParticleId: pulseCloud.nextParticleId,
      };
    }
    resolvedState = puffState;
  }

  while (resolvedState.nextCheckpointIndex < resolvedState.level.checkpoints.length) {
    const checkpoint = resolvedState.level.checkpoints[resolvedState.nextCheckpointIndex];
    if (resolvedState.train.x < checkpoint.x) {
      break;
    }

    resolvedState = resolveCheckpoint(resolvedState, checkpoint, elapsedMs);
    if (resolvedState.playState === "crashed") {
      return {
        ...resolvedState,
        statusText: getStatusText(resolvedState),
      };
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
      },
      statusText: "Level complete!",
    };
  }

  return {
    ...resolvedState,
    statusText: getStatusText(resolvedState),
  };
};
