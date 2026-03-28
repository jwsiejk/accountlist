"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceSimulation = exports.restartSimulation = exports.triggerSteamPuff = exports.triggerWhistle = exports.setSwitchState = exports.setDriveCommand = exports.createSimulation = void 0;
const particles_1 = require("./particles");
const trainCatalog_1 = require("./trainCatalog");
const visuals_1 = require("./visuals");
const TRACK_Y = 320;
const clampDeltaMs = (dtMs) => Math.min(Math.max(dtMs, 0), 64);
const getTargetSpeed = (state) => {
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
const getCommandHandlingMultiplier = (command) => {
    if (command === "go") {
        return { accel: 1.1, brake: 0.92 };
    }
    if (command === "slow") {
        return { accel: 1, brake: 1.08 };
    }
    return { accel: 0.94, brake: 1.28 };
};
const getStatusText = (state) => {
    if (state.playState === "crashed") {
        return "Oops, gentle bump! We can try again.";
    }
    if (state.playState === "rewinding") {
        return "Rolling back for a quick retry";
    }
    if (state.playState === "completed") {
        return state.mode === "free-play" ? "Sandbox loop! Keep exploring." : "Level complete! Great driving!";
    }
    if (state.level.stationStop && !state.stationStopCompleted) {
        const zone = state.level.stationStop;
        if (state.train.x < zone.startX - 36) {
            return "Station ahead: get ready to slow down";
        }
        if (state.train.x >= zone.startX - 36 && state.train.x <= zone.endX + 18) {
            return "Brake gently inside the station zone";
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
        return "Braking to a comfy stop";
    }
    if (state.driveCommand === "slow") {
        return "Nice and easy";
    }
    return "Steady steam ahead";
};
const createRunningState = (train, level, mode, elapsedMs) => ({
    train: {
        definition: train,
        profile: (0, trainCatalog_1.deriveTrainHandlingProfile)(train),
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
const createSimulation = (train, level, mode = "levels") => createRunningState(train, level, mode, 0);
exports.createSimulation = createSimulation;
const setDriveCommand = (state, driveCommand) => {
    if (state.playState !== "running") {
        return state;
    }
    return { ...state, driveCommand };
};
exports.setDriveCommand = setDriveCommand;
const setSwitchState = (state, switchState) => {
    if (state.playState !== "running") {
        return state;
    }
    return {
        ...state,
        switchState,
    };
};
exports.setSwitchState = setSwitchState;
const triggerWhistle = (state) => ({
    ...state,
    whistleAtMs: state.elapsedMs,
});
exports.triggerWhistle = triggerWhistle;
const triggerSteamPuff = (state) => {
    const emitter = state.train.definition.locomotive.steamEmitter;
    const emitted = (0, particles_1.emitSteamParticles)(state.particles, emitter, state.train.x + emitter.offsetX, state.train.y + emitter.offsetY, 220, "puff", state.nextParticleId);
    return {
        ...state,
        particles: emitted.particles,
        nextParticleId: emitted.nextParticleId,
    };
};
exports.triggerSteamPuff = triggerSteamPuff;
const restartSimulation = (state, elapsedMs = state.elapsedMs) => createRunningState(state.train.definition, state.level, state.mode, elapsedMs);
exports.restartSimulation = restartSimulation;
const resolveCheckpoint = (state, checkpoint, elapsedMs) => {
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
const processRewind = (state, elapsedMs) => {
    if (state.playState === "crashed" && state.crashAtMs !== null && elapsedMs - state.crashAtMs >= state.level.crashPauseMs) {
        return {
            ...state,
            playState: "rewinding",
            rewindStartMs: elapsedMs,
            particles: [],
        };
    }
    if (state.playState === "rewinding" && state.rewindStartMs !== null) {
        const progress = (elapsedMs - state.rewindStartMs) / state.level.rewindDurationMs;
        if (progress >= 1) {
            return (0, exports.restartSimulation)(state, elapsedMs);
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
const stepSpeed = (speed, targetSpeed, dtMs, accel, brake, drag) => {
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
const advanceSimulation = (state, dtInputMs) => {
    const dtMs = clampDeltaMs(dtInputMs);
    const elapsedMs = state.elapsedMs + dtMs;
    let nextState = {
        ...state,
        elapsedMs,
        particles: (0, particles_1.stepSteamParticles)(state.particles, dtMs),
    };
    const emitter = state.train.definition.locomotive.steamEmitter;
    const ambient = (0, particles_1.emitSteamParticles)(nextState.particles, emitter, state.train.x + emitter.offsetX, state.train.y + emitter.offsetY, dtMs, "ambient", nextState.nextParticleId);
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
            return (0, exports.restartSimulation)(nextState, elapsedMs);
        }
        return { ...nextState, statusText: getStatusText(nextState) };
    }
    const targetSpeed = getTargetSpeed(nextState);
    const commandHandling = getCommandHandlingMultiplier(nextState.driveCommand);
    const nextSpeed = stepSpeed(nextState.train.speed, targetSpeed, dtMs, nextState.train.profile.acceleration * commandHandling.accel, nextState.train.profile.braking * commandHandling.brake, nextState.train.profile.rollingDrag);
    const movement = (nextSpeed * dtMs) / 1000;
    const wheelRadius = nextState.train.definition.locomotive.wheelSet.radius;
    const wheelRotationDelta = movement / Math.max(8, wheelRadius);
    const nextWheelRotationRad = nextState.train.wheelRotationRad + wheelRotationDelta;
    const trainX = nextState.train.x + movement;
    let resolvedState = {
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
        const forgivingInZone = inZone && resolvedState.train.speed <= stationStop.forgivingSpeed;
        if (stoppedInZone) {
            const progress = resolvedState.stationStopProgressMs + dtMs;
            const complete = progress >= stationStop.requiredStopMs;
            resolvedState = {
                ...resolvedState,
                stationStopProgressMs: progress,
                stationStopCompleted: complete,
                stationStopPerfect: complete,
            };
        }
        else if (forgivingInZone) {
            const easedDelta = dtMs * 0.65;
            resolvedState = {
                ...resolvedState,
                stationStopProgressMs: Math.max(0, resolvedState.stationStopProgressMs + easedDelta),
            };
        }
        else if (resolvedState.stationStopProgressMs > 0 && resolvedState.mode === "levels") {
            const decay = (stationStop.progressDecayPerSecond * dtMs) / 1000;
            resolvedState = {
                ...resolvedState,
                stationStopProgressMs: Math.max(0, resolvedState.stationStopProgressMs - decay),
            };
        }
        if (resolvedState.mode === "levels" &&
            !resolvedState.stationStopCompleted &&
            resolvedState.train.x > stationStop.endX + stationStop.exitGraceDistance) {
            return {
                ...resolvedState,
                playState: "crashed",
                crashAtMs: elapsedMs,
                crashedThisRun: true,
                train: {
                    ...resolvedState.train,
                    speed: 0,
                },
                statusText: "Almost! Slow more in the station zone",
            };
        }
    }
    const chuffPulses = (0, visuals_1.countChuffPulses)(nextState.train.wheelRotationRad, nextWheelRotationRad);
    if (chuffPulses > 0) {
        let puffState = resolvedState;
        for (let pulse = 0; pulse < chuffPulses; pulse += 1) {
            const pulseCloud = (0, particles_1.emitSteamParticles)(puffState.particles, emitter, puffState.train.x + emitter.offsetX + (Math.random() - 0.5) * 4, puffState.train.y + emitter.offsetY, 120, "puff", puffState.nextParticleId);
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
            return (0, exports.restartSimulation)(resolvedState, elapsedMs);
        }
        return {
            ...resolvedState,
            playState: "completed",
            train: {
                ...resolvedState.train,
                x: resolvedState.level.destinationX,
            },
            statusText: "Level complete! Great driving!",
        };
    }
    return {
        ...resolvedState,
        statusText: getStatusText(resolvedState),
    };
};
exports.advanceSimulation = advanceSimulation;
