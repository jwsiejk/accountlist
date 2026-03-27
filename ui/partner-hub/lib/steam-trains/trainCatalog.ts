import type { TrainDefinition } from "./types";

export const STEAM_TRAIN_CATALOG: TrainDefinition[] = [
  {
    id: "big-boy-junior",
    displayName: "Big Steam Friend",
    baseSpeed: 68,
    locomotive: {
      id: "big-boy-junior-loco",
      name: "Big Boy Junior",
      bodyLength: 300,
      bodyHeight: 84,
      color: "#171717",
      trimColor: "#9b7f2f",
      wheelSet: {
        id: "big-boy-junior-wheels",
        count: 3,
        radius: 34,
        spacing: 86,
        offsetX: 54,
      },
      pilotWheels: {
        count: 2,
        radius: 14,
        spacing: 24,
        offsetX: 0,
        yOffset: -2,
      },
      trailingWheels: {
        count: 2,
        radius: 16,
        spacing: 26,
        offsetX: 256,
        yOffset: -2,
      },
      stack: {
        width: 20,
        height: 34,
        flareWidth: 34,
        flareHeight: 10,
        offsetX: 72,
        offsetY: -104,
      },
      cab: {
        width: 86,
        height: 66,
        roofOverhang: 14,
        roofHeight: 12,
        offsetX: 204,
        windowWidth: 18,
        windowHeight: 16,
      },
      headlamp: {
        radius: 10,
        offsetX: 8,
        offsetY: -56,
        rimColor: "#d4a11d",
        glowColor: "rgba(255, 239, 174, 0.62)",
      },
      pilot: {
        length: 46,
        height: 28,
        color: "#374151",
        ribCount: 6,
      },
      drivingRod: {
        id: "big-boy-junior-rods",
        wheelIndex: 1,
        crankRadius: 13,
        rodLength: 142,
        anchorOffsetY: -4,
        thickness: 8,
      },
      steamEmitter: {
        id: "big-boy-junior-stack",
        offsetX: 84,
        offsetY: -112,
        ambientRate: 6,
        ambientVelocity: 0.023,
        puffRate: 40,
        puffVelocity: 0.07,
        maxLifetimeMs: 1000,
      },
    },
    tender: {
      id: "big-boy-junior-tender",
      length: 160,
      height: 62,
      color: "#1f2937",
    },
    rollingStock: [],
  },
];

const catalogById = new Map(STEAM_TRAIN_CATALOG.map((train) => [train.id, train]));

export const getTrainDefinition = (id: string): TrainDefinition => {
  const train = catalogById.get(id);
  if (!train) {
    throw new Error(`Unknown train definition: ${id}`);
  }
  return train;
};
