import type { LevelDefinition } from "./types";

export const STEAM_TRAINS_LEVELS: LevelDefinition[] = [
  {
    id: "yard-switch-intro",
    name: "Switch Yard",
    width: 1200,
    startX: 120,
    switchX: 560,
    forkLength: 190,
    destinationX: 1080,
    safeBranch: "main",
    crashResetDelayMs: 650,
  },
];

const levelById = new Map(STEAM_TRAINS_LEVELS.map((level) => [level.id, level]));

export const getLevelDefinition = (id: string): LevelDefinition => {
  const level = levelById.get(id);
  if (!level) {
    throw new Error(`Unknown level definition: ${id}`);
  }
  return level;
};
