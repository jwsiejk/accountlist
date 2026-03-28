import type { LevelDefinition } from "./types";

export const STEAM_TRAINS_LEVELS: LevelDefinition[] = [
  {
    id: "level-1-switch-start",
    order: 1,
    name: "Level 1",
    width: 980,
    startX: 90,
    destinationX: 860,
    forkLength: 180,
    checkpoints: [
      {
        id: "switch-a",
        x: 430,
        safeBranch: "main",
        promptIcon: "switch",
        promptText: "Pick the top track",
        anticipationDistance: 240,
      },
    ],
    baseSpeedMultiplier: 0.84,
    tutorialCue: "Tap GO, then choose one track before the sign.",
    scene: "yard",
    crashPauseMs: 300,
    rewindDurationMs: 330,
    goals: [
      { id: "move", icon: "go", label: "Start moving" },
      { id: "switch", icon: "switch", label: "Pick the top track" },
      { id: "finish", icon: "finish", label: "Reach the flag" },
    ],
  },
  {
    id: "level-2-two-routes",
    order: 2,
    name: "Level 2",
    width: 1100,
    startX: 90,
    destinationX: 980,
    forkLength: 200,
    checkpoints: [
      {
        id: "switch-a",
        x: 500,
        safeBranch: "siding",
        promptIcon: "switch",
        promptText: "Pick the side track",
        anticipationDistance: 250,
      },
    ],
    baseSpeedMultiplier: 0.9,
    tutorialCue: "Pick the side track, then drive to the finish.",
    scene: "yard",
    crashPauseMs: 300,
    rewindDurationMs: 340,
    goals: [
      { id: "switch", icon: "switch", label: "Pick side track" },
      { id: "finish", icon: "finish", label: "Reach destination" },
    ],
  },
  {
    id: "level-3-station-stop",
    order: 3,
    name: "Level 3",
    width: 1180,
    startX: 95,
    destinationX: 1040,
    forkLength: 205,
    checkpoints: [
      {
        id: "station-switch",
        x: 760,
        safeBranch: "main",
        promptIcon: "switch",
        promptText: "After station, pick top track",
        anticipationDistance: 250,
      },
    ],
    baseSpeedMultiplier: 0.9,
    tutorialCue: "Stop inside the station zone, then continue.",
    scene: "station",
    crashPauseMs: 310,
    rewindDurationMs: 350,
    goals: [
      { id: "station", icon: "station", label: "Stop in station zone" },
      { id: "switch", icon: "switch", label: "Pick top track" },
      { id: "finish", icon: "finish", label: "Drive to finish" },
    ],
    stationStop: {
      startX: 454,
      endX: 628,
      requiredStopMs: 550,
      maxEntrySpeed: 14,
      forgivingSpeed: 22,
      progressDecayPerSecond: 220,
      exitGraceDistance: 34,
    },
  },
  {
    id: "level-4-bridge-tunnel",
    order: 4,
    name: "Level 4",
    width: 1260,
    startX: 100,
    destinationX: 1120,
    forkLength: 210,
    checkpoints: [
      {
        id: "bridge-switch",
        x: 610,
        safeBranch: "siding",
        promptIcon: "bridge",
        promptText: "Bridge is side track",
        anticipationDistance: 280,
      },
    ],
    baseSpeedMultiplier: 0.96,
    tutorialCue: "Bridge route is on the side track. Decide early.",
    scene: "bridge",
    crashPauseMs: 320,
    rewindDurationMs: 360,
    goals: [
      { id: "switch", icon: "switch", label: "Pick bridge route" },
      { id: "finish", icon: "finish", label: "Reach destination" },
    ],
  },
  {
    id: "level-5-fast-switches",
    order: 5,
    name: "Level 5",
    width: 1380,
    startX: 100,
    destinationX: 1240,
    forkLength: 210,
    checkpoints: [
      {
        id: "switch-a",
        x: 520,
        safeBranch: "main",
        promptIcon: "switch",
        promptText: "First: top track",
        anticipationDistance: 260,
      },
      {
        id: "switch-b",
        x: 840,
        safeBranch: "siding",
        promptIcon: "tunnel",
        promptText: "Second: side tunnel",
        anticipationDistance: 280,
      },
    ],
    baseSpeedMultiplier: 1,
    tutorialCue: "Two route picks: top first, side second.",
    scene: "tunnel",
    crashPauseMs: 320,
    rewindDurationMs: 370,
    goals: [
      { id: "switch-a", icon: "switch", label: "Pick top track first" },
      { id: "switch-b", icon: "switch", label: "Then pick side track" },
      { id: "finish", icon: "finish", label: "Finish run" },
    ],
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
