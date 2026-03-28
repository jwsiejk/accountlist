"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceSimulation = exports.restartSimulation = exports.triggerSteamPuff = exports.triggerWhistle = exports.setSwitchState = exports.createSimulation = void 0;
const particles_1 = require("./particles");
const TRACK_Y = 320;
const clampDeltaMs = (dtMs) => Math.min(Math.max(dtMs, 0), 64);
const getSpeed = (train, level) => train.baseSpeed * level.baseSpeedMultiplier;
const createRunningState = (train, level, mode, elapsedMs) => ({
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
    stationStopCompleted: false,
    stationStopUntilMs: null,
});
const createSimulation = (train, level, mode = "levels") => createRunningState(train, level, mode, 0);
exports.createSimulation = createSimulation;
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
        return processRewind(nextState, elapsedMs);
    }
    if (nextState.playState === "completed") {
        if (nextState.mode === "free-play") {
            return (0, exports.restartSimulation)(nextState, elapsedMs);
        }
        return nextState;
    }
    if (nextState.stationStopUntilMs !== null) {
        if (elapsedMs < nextState.stationStopUntilMs) {
            return {
                ...nextState,
                train: {
                    ...nextState.train,
                    speed: 0,
                },
            };
        }
        nextState = {
            ...nextState,
            stationStopUntilMs: null,
            train: {
                ...nextState.train,
                speed: getSpeed(nextState.train.definition, nextState.level),
            },
        };
    }
    const movement = (nextState.train.speed * dtMs) / 1000;
    const wheelRadius = nextState.train.definition.locomotive.wheelSet.radius;
    const wheelRotationDelta = movement / Math.max(8, wheelRadius);
    const trainX = nextState.train.x + movement;
    let resolvedState = {
        ...nextState,
        train: {
            ...nextState.train,
            x: trainX,
            wheelRotationRad: nextState.train.wheelRotationRad + wheelRotationDelta,
        },
    };
    const stationStop = resolvedState.level.stationStop;
    if (stationStop && !resolvedState.stationStopCompleted && resolvedState.train.x >= stationStop.x) {
        return {
            ...resolvedState,
            stationStopCompleted: true,
            stationStopUntilMs: elapsedMs + stationStop.pauseMs,
            train: {
                ...resolvedState.train,
                x: stationStop.x,
                speed: 0,
            },
        };
    }
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
            return (0, exports.restartSimulation)(resolvedState, elapsedMs);
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
exports.advanceSimulation = advanceSimulation;
