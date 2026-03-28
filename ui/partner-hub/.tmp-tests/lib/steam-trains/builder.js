"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTrainDefinitionFromSelection = exports.isCustomTrainId = exports.toCustomTrainId = exports.validateTrainBuilderSelection = exports.sanitizeTrainBuilderSelection = exports.getDefaultTrainBuilderSelection = exports.TRAIN_BUILDER_SLOT_OPTIONS = exports.CUSTOM_TRAIN_ID_PREFIX = void 0;
exports.CUSTOM_TRAIN_ID_PREFIX = "custom-train-";
const wheelArrangements = [
    {
        id: "arrangement-switcher",
        label: "Small 0-4-0",
        wheelArrangement: "0-4-0T",
        bodyLength: 230,
        bodyHeight: 72,
        wheelSet: { count: 2, radius: 28, spacing: 74, offsetX: 66 },
        baseSpeed: 66,
        allowedRodStyleIds: ["rod-classic", "rod-stout"],
        allowedTenderStyleIds: ["tender-none", "tender-short"],
    },
    {
        id: "arrangement-passenger",
        label: "Fast 4-6-2",
        wheelArrangement: "4-6-2",
        bodyLength: 312,
        bodyHeight: 84,
        wheelSet: { count: 3, radius: 34, spacing: 82, offsetX: 74 },
        pilotWheels: { count: 2, radius: 14, spacing: 24, offsetX: 12, yOffset: -2 },
        trailingWheels: { count: 1, radius: 16, spacing: 26, offsetX: 278, yOffset: -2 },
        baseSpeed: 72,
        allowedRodStyleIds: ["rod-classic", "rod-streamlined"],
        allowedTenderStyleIds: ["tender-short", "tender-long"],
    },
    {
        id: "arrangement-freight",
        label: "Strong 2-8-0",
        wheelArrangement: "2-8-0",
        bodyLength: 338,
        bodyHeight: 90,
        wheelSet: { count: 4, radius: 32, spacing: 72, offsetX: 56 },
        pilotWheels: { count: 1, radius: 16, spacing: 20, offsetX: 14, yOffset: -2 },
        baseSpeed: 62,
        allowedRodStyleIds: ["rod-stout", "rod-streamlined"],
        allowedTenderStyleIds: ["tender-short", "tender-long"],
    },
];
const bodyShells = [
    { id: "body-round", label: "Round Boiler", bodyLengthAdjust: 0, bodyHeightAdjust: 0 },
    { id: "body-tall", label: "Tall Boiler", bodyLengthAdjust: 10, bodyHeightAdjust: 4 },
    { id: "body-compact", label: "Compact Boiler", bodyLengthAdjust: -8, bodyHeightAdjust: -3 },
];
const stackPresets = [
    { id: "stack-straight", label: "Straight Stack", width: 18, height: 34, flareWidth: 30, flareHeight: 9 },
    { id: "stack-wide", label: "Wide Stack", width: 22, height: 36, flareWidth: 36, flareHeight: 10 },
    { id: "stack-tall", label: "Tall Stack", width: 20, height: 40, flareWidth: 32, flareHeight: 11 },
];
const cabPresets = [
    { id: "cab-classic", label: "Classic Cab", width: 82, height: 62, roofOverhang: 14, roofHeight: 11 },
    { id: "cab-wide", label: "Wide Cab", width: 94, height: 70, roofOverhang: 16, roofHeight: 12 },
    { id: "cab-compact", label: "Compact Cab", width: 72, height: 58, roofOverhang: 12, roofHeight: 10 },
];
const headlampPresets = [
    { id: "lamp-gold", label: "Gold Lamp", radius: 10, rimColor: "#f59e0b", glowColor: "rgba(255, 236, 177, 0.65)" },
    { id: "lamp-copper", label: "Copper Lamp", radius: 9, rimColor: "#c2410c", glowColor: "rgba(255, 228, 196, 0.62)" },
    { id: "lamp-steel", label: "Steel Lamp", radius: 9, rimColor: "#94a3b8", glowColor: "rgba(226, 232, 240, 0.62)" },
];
const rodStyles = [
    { id: "rod-classic", label: "Classic Rod", anchorOffsetY: -4, thickness: 8, crankRadiusOffset: 0, maxSupportedDrivers: 4 },
    { id: "rod-stout", label: "Heavy Rod", anchorOffsetY: -3, thickness: 9, crankRadiusOffset: -1, maxSupportedDrivers: 4 },
    { id: "rod-streamlined", label: "Streamline Rod", anchorOffsetY: -5, thickness: 7, crankRadiusOffset: 1, maxSupportedDrivers: 4 },
];
const tenderStyles = [
    { id: "tender-none", label: "No Tender", length: 0, height: 0, requiredMinimumDrivers: 0 },
    { id: "tender-short", label: "Short Tender", length: 150, height: 60, requiredMinimumDrivers: 2 },
    { id: "tender-long", label: "Long Tender", length: 184, height: 68, requiredMinimumDrivers: 3 },
];
const carSets = [
    { id: "cars-none", label: "No Cars", cars: [] },
    {
        id: "cars-passenger",
        label: "Passenger Cars",
        cars: [
            { length: 132, height: 50, tint: 0 },
            { length: 132, height: 50, tint: 8 },
        ],
    },
    {
        id: "cars-freight",
        label: "Freight Cars",
        cars: [
            { length: 146, height: 54, tint: -16 },
            { length: 146, height: 54, tint: 6 },
        ],
    },
];
const accentColors = [
    {
        id: "accent-ember",
        label: "Ember",
        locomotiveColor: "#111827",
        trimColor: "#c2410c",
        tenderColor: "#1e293b",
        carColor: "#9a3412",
    },
    {
        id: "accent-forest",
        label: "Forest",
        locomotiveColor: "#1f2937",
        trimColor: "#15803d",
        tenderColor: "#0f172a",
        carColor: "#166534",
    },
    {
        id: "accent-ocean",
        label: "Ocean",
        locomotiveColor: "#0f172a",
        trimColor: "#2563eb",
        tenderColor: "#1e293b",
        carColor: "#1d4ed8",
    },
    {
        id: "accent-sun",
        label: "Sun",
        locomotiveColor: "#111827",
        trimColor: "#ca8a04",
        tenderColor: "#1f2937",
        carColor: "#a16207",
    },
];
exports.TRAIN_BUILDER_SLOT_OPTIONS = {
    smokestack: stackPresets.map((item) => ({ id: item.id, label: item.label })),
    bodyShell: bodyShells.map((item) => ({ id: item.id, label: item.label })),
    cab: cabPresets.map((item) => ({ id: item.id, label: item.label })),
    headlamp: headlampPresets.map((item) => ({ id: item.id, label: item.label })),
    wheelArrangement: wheelArrangements.map((item) => ({ id: item.id, label: item.label })),
    drivingRodStyle: rodStyles.map((item) => ({ id: item.id, label: item.label })),
    tenderStyle: tenderStyles.map((item) => ({ id: item.id, label: item.label })),
    carSet: carSets.map((item) => ({ id: item.id, label: item.label })),
    accentColor: accentColors.map((item) => ({ id: item.id, label: item.label })),
};
const getDefaultTrainBuilderSelection = () => ({
    smokestackId: stackPresets[0].id,
    bodyShellId: bodyShells[0].id,
    cabId: cabPresets[0].id,
    headlampId: headlampPresets[0].id,
    wheelArrangementId: wheelArrangements[0].id,
    drivingRodStyleId: rodStyles[0].id,
    tenderStyleId: tenderStyles[1].id,
    carSetId: carSets[0].id,
    numberPlate: "7",
    trainName: "My Train",
    accentColorId: accentColors[0].id,
});
exports.getDefaultTrainBuilderSelection = getDefaultTrainBuilderSelection;
const mapById = (items) => new Map(items.map((item) => [item.id, item]));
const wheelArrangementsById = mapById(wheelArrangements);
const bodyShellsById = mapById(bodyShells);
const stackById = mapById(stackPresets);
const cabById = mapById(cabPresets);
const headlampById = mapById(headlampPresets);
const rodById = mapById(rodStyles);
const tenderById = mapById(tenderStyles);
const carSetById = mapById(carSets);
const accentById = mapById(accentColors);
const getFallback = (map, preferredId, fallback) => map.get(preferredId) ?? fallback;
const sanitizeTrainBuilderSelection = (input) => {
    const defaults = (0, exports.getDefaultTrainBuilderSelection)();
    if (!input || typeof input !== "object") {
        return defaults;
    }
    const data = input;
    return {
        smokestackId: stackById.has(String(data.smokestackId)) ? String(data.smokestackId) : defaults.smokestackId,
        bodyShellId: bodyShellsById.has(String(data.bodyShellId)) ? String(data.bodyShellId) : defaults.bodyShellId,
        cabId: cabById.has(String(data.cabId)) ? String(data.cabId) : defaults.cabId,
        headlampId: headlampById.has(String(data.headlampId)) ? String(data.headlampId) : defaults.headlampId,
        wheelArrangementId: wheelArrangementsById.has(String(data.wheelArrangementId))
            ? String(data.wheelArrangementId)
            : defaults.wheelArrangementId,
        drivingRodStyleId: rodById.has(String(data.drivingRodStyleId)) ? String(data.drivingRodStyleId) : defaults.drivingRodStyleId,
        tenderStyleId: tenderById.has(String(data.tenderStyleId)) ? String(data.tenderStyleId) : defaults.tenderStyleId,
        carSetId: carSetById.has(String(data.carSetId)) ? String(data.carSetId) : defaults.carSetId,
        numberPlate: String(data.numberPlate ?? defaults.numberPlate).slice(0, 4).replace(/[^0-9A-Z]/gi, "") || defaults.numberPlate,
        trainName: String(data.trainName ?? defaults.trainName).slice(0, 24).trim() || defaults.trainName,
        accentColorId: accentById.has(String(data.accentColorId)) ? String(data.accentColorId) : defaults.accentColorId,
    };
};
exports.sanitizeTrainBuilderSelection = sanitizeTrainBuilderSelection;
const validateTrainBuilderSelection = (selection) => {
    const issues = [];
    const wheel = getFallback(wheelArrangementsById, selection.wheelArrangementId, wheelArrangements[0]);
    const rod = getFallback(rodById, selection.drivingRodStyleId, rodStyles[0]);
    const tender = getFallback(tenderById, selection.tenderStyleId, tenderStyles[0]);
    if (!wheel.allowedRodStyleIds.includes(rod.id)) {
        issues.push("driving-rod-incompatible");
    }
    if (!wheel.allowedTenderStyleIds.includes(tender.id)) {
        issues.push("tender-incompatible");
    }
    if (wheel.wheelSet.count > rod.maxSupportedDrivers) {
        issues.push("rod-geometry-overflow");
    }
    if (tender.requiredMinimumDrivers > wheel.wheelSet.count) {
        issues.push("tender-driver-mismatch");
    }
    return issues;
};
exports.validateTrainBuilderSelection = validateTrainBuilderSelection;
const adjustHex = (hex, amount) => {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) {
        return hex;
    }
    const n = Number.parseInt(clean, 16);
    const clamp = (value) => Math.max(0, Math.min(255, value));
    const r = clamp((n >> 16) + amount);
    const g = clamp(((n >> 8) & 0xff) + amount);
    const b = clamp((n & 0xff) + amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
};
const buildStack = (preset, bodyHeight) => ({
    ...preset,
    offsetX: 84,
    offsetY: -Math.max(90, bodyHeight + 20),
});
const buildCab = (preset, bodyLength) => ({
    ...preset,
    offsetX: Math.round(bodyLength * 0.66),
    windowWidth: 18,
    windowHeight: 15,
});
const buildHeadlamp = (preset) => ({
    ...preset,
    offsetX: 11,
    offsetY: -56,
});
const buildDrivingRod = (wheel, rod) => {
    const wheelIndex = Math.min(wheel.wheelSet.count - 1, Math.max(1, Math.floor((wheel.wheelSet.count - 1) / 2) + 1));
    return {
        id: `${wheel.id}-${rod.id}-rod`,
        wheelIndex,
        crankRadius: Math.max(10, Math.round(wheel.wheelSet.radius * 0.36) + rod.crankRadiusOffset),
        rodLength: Math.round(wheel.wheelSet.spacing * (wheel.wheelSet.count - 1) + 66),
        anchorOffsetY: rod.anchorOffsetY,
        thickness: rod.thickness,
    };
};
const buildEmitter = (stack) => ({
    id: `custom-stack-steam`,
    offsetX: stack.offsetX + Math.round(stack.width * 0.5),
    offsetY: stack.offsetY - 8,
    ambientRate: 6,
    ambientVelocity: 0.024,
    puffRate: 42,
    puffVelocity: 0.072,
    maxLifetimeMs: 1020,
});
const toSafeName = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "custom";
const toCustomTrainId = (selection, nowMs) => `${exports.CUSTOM_TRAIN_ID_PREFIX}${toSafeName(selection.trainName)}-${nowMs.toString(36)}`;
exports.toCustomTrainId = toCustomTrainId;
const isCustomTrainId = (trainId) => trainId.startsWith(exports.CUSTOM_TRAIN_ID_PREFIX);
exports.isCustomTrainId = isCustomTrainId;
const buildTrainDefinitionFromSelection = (rawSelection, trainId) => {
    const selection = (0, exports.sanitizeTrainBuilderSelection)(rawSelection);
    const issues = (0, exports.validateTrainBuilderSelection)(selection);
    if (issues.length > 0) {
        throw new Error(`Invalid train builder selection: ${issues.join(",")}`);
    }
    const wheel = getFallback(wheelArrangementsById, selection.wheelArrangementId, wheelArrangements[0]);
    const body = getFallback(bodyShellsById, selection.bodyShellId, bodyShells[0]);
    const stack = getFallback(stackById, selection.smokestackId, stackPresets[0]);
    const cab = getFallback(cabById, selection.cabId, cabPresets[0]);
    const headlamp = getFallback(headlampById, selection.headlampId, headlampPresets[0]);
    const rod = getFallback(rodById, selection.drivingRodStyleId, rodStyles[0]);
    const tender = getFallback(tenderById, selection.tenderStyleId, tenderStyles[0]);
    const carSet = getFallback(carSetById, selection.carSetId, carSets[0]);
    const accent = getFallback(accentById, selection.accentColorId, accentColors[0]);
    const bodyLength = wheel.bodyLength + body.bodyLengthAdjust;
    const bodyHeight = wheel.bodyHeight + body.bodyHeightAdjust;
    const stackDefinition = buildStack(stack, bodyHeight);
    const locomotive = {
        id: `${trainId}-locomotive`,
        name: selection.trainName,
        wheelArrangement: wheel.wheelArrangement,
        bodyLength,
        bodyHeight,
        color: accent.locomotiveColor,
        trimColor: accent.trimColor,
        wheelSet: {
            id: `${trainId}-drivers`,
            ...wheel.wheelSet,
        },
        pilotWheels: wheel.pilotWheels,
        trailingWheels: wheel.trailingWheels,
        stack: stackDefinition,
        cab: buildCab(cab, bodyLength),
        headlamp: buildHeadlamp(headlamp),
        pilot: {
            length: 44,
            height: 28,
            color: "#334155",
            ribCount: 6,
        },
        drivingRod: buildDrivingRod(wheel, rod),
        steamEmitter: buildEmitter(stackDefinition),
    };
    const tenderDefinition = tender.id === "tender-none"
        ? undefined
        : {
            id: `${trainId}-${tender.id}`,
            length: tender.length,
            height: tender.height,
            color: accent.tenderColor,
        };
    const rollingStock = carSet.cars.map((car, index) => ({
        id: `${trainId}-${carSet.id}-${index + 1}`,
        type: "car",
        length: car.length,
        height: car.height,
        color: adjustHex(accent.carColor, car.tint),
    }));
    return {
        id: trainId,
        displayName: `${selection.trainName} #${selection.numberPlate}`,
        locomotive,
        tender: tenderDefinition,
        rollingStock,
        baseSpeed: wheel.baseSpeed,
    };
};
exports.buildTrainDefinitionFromSelection = buildTrainDefinitionFromSelection;
