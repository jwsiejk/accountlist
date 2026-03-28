import type { TrainDefinition } from "./types";

export const STEAM_TRAIN_CATALOG: TrainDefinition[] = [
  {
    id: "copper-creek-switcher",
    displayName: "Little Switcher",
    baseSpeed: 66,
    locomotive: {
      id: "copper-creek-switcher-loco",
      name: "Copper Creek Switcher",
      wheelArrangement: "0-4-0T",
      bodyLength: 218,
      bodyHeight: 70,
      color: "#1f2937",
      trimColor: "#d97706",
      wheelSet: {
        id: "copper-creek-switcher-wheels",
        count: 2,
        radius: 28,
        spacing: 70,
        offsetX: 62,
      },
      stack: {
        width: 18,
        height: 32,
        flareWidth: 28,
        flareHeight: 8,
        offsetX: 76,
        offsetY: -92,
      },
      cab: {
        width: 68,
        height: 56,
        roofOverhang: 12,
        roofHeight: 10,
        offsetX: 140,
        windowWidth: 16,
        windowHeight: 15,
      },
      headlamp: {
        radius: 9,
        offsetX: 10,
        offsetY: -48,
        rimColor: "#f59e0b",
        glowColor: "rgba(255, 237, 178, 0.62)",
      },
      pilot: {
        length: 38,
        height: 24,
        color: "#374151",
        ribCount: 5,
      },
      drivingRod: {
        id: "copper-creek-switcher-rods",
        wheelIndex: 1,
        crankRadius: 11,
        rodLength: 108,
        anchorOffsetY: -3,
        thickness: 7,
      },
      steamEmitter: {
        id: "copper-creek-switcher-stack",
        offsetX: 84,
        offsetY: -98,
        ambientRate: 6,
        ambientVelocity: 0.023,
        puffRate: 40,
        puffVelocity: 0.07,
        maxLifetimeMs: 980,
      },
    },
    rollingStock: [],
  },
  {
    id: "sunset-passenger",
    displayName: "Classic Express",
    baseSpeed: 70,
    locomotive: {
      id: "sunset-passenger-loco",
      name: "Sunset Passenger",
      wheelArrangement: "4-6-2",
      bodyLength: 308,
      bodyHeight: 82,
      color: "#111827",
      trimColor: "#c2410c",
      wheelSet: {
        id: "sunset-passenger-drivers",
        count: 3,
        radius: 34,
        spacing: 82,
        offsetX: 74,
      },
      pilotWheels: {
        count: 2,
        radius: 14,
        spacing: 24,
        offsetX: 10,
        yOffset: -2,
      },
      trailingWheels: {
        count: 1,
        radius: 16,
        spacing: 26,
        offsetX: 274,
        yOffset: -2,
      },
      stack: {
        width: 18,
        height: 35,
        flareWidth: 30,
        flareHeight: 10,
        offsetX: 92,
        offsetY: -105,
      },
      cab: {
        width: 82,
        height: 63,
        roofOverhang: 14,
        roofHeight: 12,
        offsetX: 214,
        windowWidth: 18,
        windowHeight: 15,
      },
      headlamp: {
        radius: 10,
        offsetX: 12,
        offsetY: -56,
        rimColor: "#f59e0b",
        glowColor: "rgba(255, 245, 193, 0.64)",
      },
      pilot: {
        length: 44,
        height: 28,
        color: "#334155",
        ribCount: 6,
      },
      drivingRod: {
        id: "sunset-passenger-rods",
        wheelIndex: 1,
        crankRadius: 13,
        rodLength: 140,
        anchorOffsetY: -4,
        thickness: 8,
      },
      steamEmitter: {
        id: "sunset-passenger-stack",
        offsetX: 101,
        offsetY: -112,
        ambientRate: 6,
        ambientVelocity: 0.023,
        puffRate: 42,
        puffVelocity: 0.071,
        maxLifetimeMs: 1040,
      },
    },
    tender: {
      id: "sunset-passenger-tender",
      length: 150,
      height: 60,
      color: "#1e293b",
    },
    rollingStock: [
      {
        id: "sunset-coach-1",
        type: "car",
        length: 132,
        height: 50,
        color: "#7c2d12",
      },
      {
        id: "sunset-coach-2",
        type: "car",
        length: 132,
        height: 50,
        color: "#9a3412",
      },
    ],
  },
  {
    id: "granite-freight",
    displayName: "Heavy Hauler",
    baseSpeed: 62,
    locomotive: {
      id: "granite-freight-loco",
      name: "Granite Freight",
      wheelArrangement: "2-8-0",
      bodyLength: 338,
      bodyHeight: 90,
      color: "#111827",
      trimColor: "#a16207",
      wheelSet: {
        id: "granite-freight-drivers",
        count: 4,
        radius: 32,
        spacing: 72,
        offsetX: 56,
      },
      pilotWheels: {
        count: 1,
        radius: 16,
        spacing: 20,
        offsetX: 14,
        yOffset: -2,
      },
      stack: {
        width: 24,
        height: 42,
        flareWidth: 38,
        flareHeight: 11,
        offsetX: 86,
        offsetY: -117,
      },
      cab: {
        width: 94,
        height: 72,
        roofOverhang: 16,
        roofHeight: 12,
        offsetX: 230,
        windowWidth: 20,
        windowHeight: 16,
      },
      headlamp: {
        radius: 11,
        offsetX: 10,
        offsetY: -62,
        rimColor: "#ca8a04",
        glowColor: "rgba(254, 243, 199, 0.68)",
      },
      pilot: {
        length: 50,
        height: 30,
        color: "#1f2937",
        ribCount: 7,
      },
      drivingRod: {
        id: "granite-freight-rods",
        wheelIndex: 2,
        crankRadius: 12,
        rodLength: 172,
        anchorOffsetY: -4,
        thickness: 8,
      },
      steamEmitter: {
        id: "granite-freight-stack",
        offsetX: 96,
        offsetY: -124,
        ambientRate: 7,
        ambientVelocity: 0.025,
        puffRate: 44,
        puffVelocity: 0.074,
        maxLifetimeMs: 1090,
      },
    },
    tender: {
      id: "granite-freight-tender",
      length: 184,
      height: 68,
      color: "#0f172a",
    },
    rollingStock: [
      {
        id: "granite-freight-car-1",
        type: "car",
        length: 146,
        height: 54,
        color: "#4b5563",
      },
    ],
  },
];

export const DEFAULT_STEAM_TRAIN_ID = STEAM_TRAIN_CATALOG[0]?.id ?? "copper-creek-switcher";

const stockCatalogById = new Map(STEAM_TRAIN_CATALOG.map((train) => [train.id, train]));
const customCatalogById = new Map<string, TrainDefinition>();

export const registerCustomTrainDefinitions = (trains: TrainDefinition[]) => {
  customCatalogById.clear();
  trains.forEach((train) => {
    customCatalogById.set(train.id, train);
  });
};

export const clearCustomTrainDefinitions = () => {
  customCatalogById.clear();
};

export const getAllTrainDefinitions = (): TrainDefinition[] => [
  ...STEAM_TRAIN_CATALOG,
  ...Array.from(customCatalogById.values()),
];

export const hasTrainDefinition = (id: string): boolean => stockCatalogById.has(id) || customCatalogById.has(id);

export const getTrainDefinition = (id: string): TrainDefinition => {
  const train = customCatalogById.get(id) ?? stockCatalogById.get(id);
  if (!train) {
    throw new Error(`Unknown train definition: ${id}`);
  }
  return train;
};


export const deriveTrainHandlingProfile = (train: TrainDefinition) => {
  const driverCount = train.locomotive.wheelSet.count;
  const totalCars = train.rollingStock.length + (train.tender ? 1 : 0);
  const consistWeight = train.locomotive.bodyLength + totalCars * 108;
  const bodyHeightFactor = Math.max(0.9, Math.min(1.12, 86 / Math.max(60, train.locomotive.bodyHeight)));
  const tractionBonus = Math.max(0, (driverCount - 2) * 0.9);

  const rawTopSpeed = train.baseSpeed + 2.4 - totalCars * 1.8 + tractionBonus;
  const topSpeed = Math.max(52, Math.min(82, rawTopSpeed));
  const slowSpeed = Math.max(20, Math.min(topSpeed - 8, topSpeed * 0.56));

  const accelerationBase = 50 - driverCount * 3.5 - totalCars * 4.4;
  const acceleration = Math.max(19, Math.min(46, accelerationBase * bodyHeightFactor));

  const brakingBase = 70 - consistWeight / 20 + driverCount * 1.25;
  const braking = Math.max(26, Math.min(42, brakingBase));
  const rollingDrag = Math.max(8.4, Math.min(14, 15 - driverCount * 0.75 + totalCars * 0.4));

  const haulingClass = consistWeight >= 540 ? "heavy" : consistWeight >= 380 ? "medium" : "light";

  return {
    topSpeed,
    slowSpeed,
    acceleration,
    braking,
    rollingDrag,
    haulingClass,
  } as const;
};
