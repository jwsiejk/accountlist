"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildScene3dModel = exports.buildCabTheme = void 0;
const HUD_HORIZON_DISTANCE = 460;
const WORLD_NEAR_Z = -95;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const toForwardZ = (trainX, worldX) => worldX - trainX;
const repeatForwardZ = (offset, cycleLength) => {
    const wrapped = ((offset % cycleLength) + cycleLength) % cycleLength;
    return WORLD_NEAR_Z + wrapped;
};
const toHex = (value) => value.toString(16).padStart(2, "0");
const tintHex = (hex, factor) => {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) {
        return hex;
    }
    const clamp = (channel) => Math.max(0, Math.min(255, Math.round(channel * factor)));
    const r = clamp(Number.parseInt(clean.slice(0, 2), 16));
    const g = clamp(Number.parseInt(clean.slice(2, 4), 16));
    const b = clamp(Number.parseInt(clean.slice(4, 6), 16));
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
const buildCabTheme = (train) => {
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
exports.buildCabTheme = buildCabTheme;
const buildRepeaters = (state) => {
    const motion = state.train.x - state.level.startX;
    const sleeperSpacing = 7.8;
    const sleeperCycleLength = sleeperSpacing * 56;
    const sleepers = Array.from({ length: 56 }, (_, index) => ({
        id: `sleeper-${index}`,
        kind: "sleeper",
        x: 0,
        z: repeatForwardZ(motion + index * sleeperSpacing, sleeperCycleLength),
        scale: 1,
        variant: index % 4,
    }));
    const poleSpacing = 20;
    const poleCycleLength = poleSpacing * 30;
    const poles = Array.from({ length: 30 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        return {
            id: `pole-${index}`,
            kind: "pole",
            x: side * 10.8,
            z: repeatForwardZ(motion * 0.96 + index * poleSpacing, poleCycleLength),
            scale: side === -1 ? 1 : 0.94,
            variant: index % 3,
        };
    });
    const treeSpacing = 9.5;
    const treeCycleLength = treeSpacing * 84;
    const trees = Array.from({ length: 84 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const laneOffset = 14 + (index % 9) * 1.9 + (index % 3) * 0.7;
        return {
            id: `tree-${index}`,
            kind: "tree",
            x: side * laneOffset,
            z: repeatForwardZ(motion * 0.86 + index * treeSpacing, treeCycleLength),
            scale: 0.72 + (index % 6) * 0.11,
            variant: index % 5,
        };
    });
    return [...sleepers, ...poles, ...trees];
};
const buildClouds = (state) => {
    const motion = state.train.x - state.level.startX;
    const cloudsPerDepth = 8;
    return Array.from({ length: 16 }, (_, index) => {
        const near = index % 2 === 0;
        const spacing = near ? 96 : 128;
        const drift = near ? motion * 0.09 : motion * 0.05;
        const layerIndex = Math.floor(index / 2);
        const cycleLength = spacing * cloudsPerDepth;
        const side = index % 3 === 0 ? -1 : 1;
        return {
            id: `cloud-${index}`,
            x: side * (6 + (index % 5) * 4.2),
            y: near ? 11 + (index % 4) * 0.9 : 13 + (index % 3) * 1.2,
            z: repeatForwardZ(drift + layerIndex * spacing, cycleLength),
            scale: near ? 1 + (index % 3) * 0.26 : 1.4 + (index % 4) * 0.18,
            depth: near ? "near" : "far",
        };
    });
};
const buildRidges = (state) => {
    const motion = state.train.x - state.level.startX;
    const ridgesPerDepth = 7;
    return Array.from({ length: 14 }, (_, index) => {
        const near = index % 2 === 0;
        const spacing = near ? 72 : 110;
        const side = index % 3 === 0 ? -1 : 1;
        const layerIndex = Math.floor(index / 2);
        const cycleLength = spacing * ridgesPerDepth;
        return {
            id: `ridge-${index}`,
            x: side * (20 + (index % 4) * 7),
            y: near ? 4.8 : 5.8,
            z: repeatForwardZ((near ? motion * 0.34 : motion * 0.2) + layerIndex * spacing, cycleLength),
            width: near ? 30 + (index % 4) * 5 : 40 + (index % 3) * 6,
            height: near ? 9 + (index % 4) * 1.7 : 12 + (index % 4) * 2,
            depth: near ? "near" : "far",
            profile: index % 3 === 0 ? "peak" : index % 3 === 1 ? "slope" : "crag",
            snowCap: !near && index % 3 !== 1,
        };
    });
};
const buildBuildings = (state) => {
    const motion = state.train.x - state.level.startX;
    const density = state.level.scene === "station" || state.level.scene === "yard" ? 10 : 6;
    const buildingSpacing = 62;
    const buildingCycleLength = buildingSpacing * density;
    return Array.from({ length: density }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const palette = index % 3 === 0
            ? { wall: "#cbd5e1", roof: "#64748b", accent: "#94a3b8" }
            : index % 3 === 1
                ? { wall: "#d6d3d1", roof: "#57534e", accent: "#a8a29e" }
                : { wall: "#bfdbfe", roof: "#475569", accent: "#7dd3fc" };
        return {
            id: `building-${index}`,
            x: side * (14 + (index % 4) * 4),
            z: repeatForwardZ(motion * 0.5 + index * buildingSpacing, buildingCycleLength),
            width: 4 + (index % 3) * 1.3,
            height: 2.2 + (index % 4) * 0.6,
            depth: 3.6 + (index % 2) * 1.8,
            color: palette.wall,
            roofColor: palette.roof,
            accentColor: palette.accent,
            style: index % 3 === 0 ? "depot" : index % 3 === 1 ? "warehouse" : "townhouse",
        };
    });
};
const buildRouteCues = (state) => state.level.checkpoints
    .slice(state.nextCheckpointIndex, state.nextCheckpointIndex + 2)
    .map((checkpoint) => {
    const z = toForwardZ(state.train.x, checkpoint.x);
    return {
        id: `route-cue-${checkpoint.id}`,
        z,
        safeBranch: checkpoint.safeBranch,
        hintText: checkpoint.safeBranch === "main" ? "Top track is safe" : "Side track is safe",
        urgency: z < 140 ? "now" : "upcoming",
    };
})
    .filter((cue) => cue.z >= WORLD_NEAR_Z && cue.z <= HUD_HORIZON_DISTANCE);
const buildRoutePreviews = (state) => state.level.checkpoints
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
const buildLandmarks = (state) => {
    const landmarks = [];
    if (state.level.stationStop) {
        landmarks.push({
            id: "station-platform",
            type: "station",
            z: toForwardZ(state.train.x, state.level.stationStop.startX),
            length: Math.max(26, state.level.stationStop.endX - state.level.stationStop.startX),
            side: "left",
        });
    }
    const iconType = (icon) => {
        if (icon === "bridge")
            return "bridge";
        if (icon === "tunnel")
            return "tunnel";
        if (icon === "station")
            return "station";
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
const buildScene3dModel = (state) => {
    const nextCheckpoint = state.level.checkpoints[state.nextCheckpointIndex];
    const nextRouteLabel = nextCheckpoint
        ? `${nextCheckpoint.safeBranch === "main" ? "Top track" : "Side track"} (${Math.max(0, Math.round(nextCheckpoint.x - state.train.x))}m)`
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
        clouds: buildClouds(state),
        ridges: buildRidges(state),
        buildings: buildBuildings(state),
        routeCues: buildRouteCues(state),
    };
};
exports.buildScene3dModel = buildScene3dModel;
