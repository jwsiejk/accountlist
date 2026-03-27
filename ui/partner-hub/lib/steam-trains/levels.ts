import type { LevelDefinition } from "./types";

export const STEAM_TRAINS_LEVELS: LevelDefinition[] = [
  {
    id: "level-1-switch-start",
    order: 1,
    name: "Level 1",
    width: 980,
    startX: 100,
    destinationX: 840,
    forkLength: 180,
    checkpoints: [{ id: "switch-a", x: 420, safeBranch: "main", promptIcon: "switch" }],
    baseSpeedMultiplier: 0.9,
    tutorialCue: "Tap a big track button before the sign.",
    scene: "yard",
    crashPauseMs: 320,
    rewindDurationMs: 360,
  },
  {
    id: "level-2-two-routes",
    order: 2,
    name: "Level 2",
    width: 1080,
    startX: 100,
    destinationX: 940,
    forkLength: 190,
    checkpoints: [{ id: "switch-a", x: 460, safeBranch: "siding", promptIcon: "switch" }],
    baseSpeedMultiplier: 0.95,
    tutorialCue: "This time try the side track.",
    scene: "yard",
    crashPauseMs: 320,
    rewindDurationMs: 360,
  },
  {
    id: "level-3-station-stop",
    order: 3,
    name: "Level 3",
    width: 1180,
    startX: 110,
    destinationX: 1030,
    forkLength: 200,
    checkpoints: [{ id: "station-switch", x: 530, safeBranch: "main", promptIcon: "station" }],
    baseSpeedMultiplier: 1,
    tutorialCue: "Pass the station and pick the right track.",
    scene: "station",
    crashPauseMs: 330,
    rewindDurationMs: 380,
  },
  {
    id: "level-4-bridge-tunnel",
    order: 4,
    name: "Level 4",
    width: 1240,
    startX: 120,
    destinationX: 1090,
    forkLength: 210,
    checkpoints: [{ id: "bridge-switch", x: 560, safeBranch: "siding", promptIcon: "bridge" }],
    baseSpeedMultiplier: 1.07,
    tutorialCue: "Bridge time! Choose the glowing path.",
    scene: "bridge",
    crashPauseMs: 330,
    rewindDurationMs: 380,
  },
  {
    id: "level-5-fast-switches",
    order: 5,
    name: "Level 5",
    width: 1360,
    startX: 120,
    destinationX: 1210,
    forkLength: 210,
    checkpoints: [
      { id: "switch-a", x: 500, safeBranch: "main", promptIcon: "switch" },
      { id: "switch-b", x: 760, safeBranch: "siding", promptIcon: "tunnel" },
    ],
    baseSpeedMultiplier: 1.2,
    tutorialCue: "Two quick choices. You can do it!",
    scene: "tunnel",
    crashPauseMs: 350,
    rewindDurationMs: 420,
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

export const getFirstLevelId = () => STEAM_TRAINS_LEVELS[0]?.id ?? "";
