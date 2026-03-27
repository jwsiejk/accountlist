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
        offsetX: 64,
        offsetY: -90,
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
