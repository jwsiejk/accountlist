export type WheelSetDefinition = {
  id: string;
  count: number;
  radius: number;
  spacing: number;
  offsetX: number;
};

export type AxleWheelDefinition = {
  count: number;
  radius: number;
  spacing: number;
  offsetX: number;
  yOffset?: number;
};

export type HeadlampDefinition = {
  radius: number;
  offsetX: number;
  offsetY: number;
  rimColor: string;
  glowColor: string;
};

export type PilotDefinition = {
  length: number;
  height: number;
  color: string;
  ribCount: number;
};

export type StackDefinition = {
  width: number;
  height: number;
  flareWidth: number;
  flareHeight: number;
  offsetX: number;
  offsetY: number;
};

export type CabDefinition = {
  width: number;
  height: number;
  roofOverhang: number;
  roofHeight: number;
  offsetX: number;
  windowWidth: number;
  windowHeight: number;
};

export type DrivingRodDefinition = {
  id: string;
  wheelIndex: number;
  crankRadius: number;
  rodLength: number;
  anchorOffsetY: number;
  thickness: number;
};

export type SteamEmitterDefinition = {
  id: string;
  offsetX: number;
  offsetY: number;
  ambientRate: number;
  ambientVelocity: number;
  puffRate: number;
  puffVelocity: number;
  maxLifetimeMs: number;
};

export type LocomotiveDefinition = {
  id: string;
  name: string;
  wheelArrangement: string;
  bodyLength: number;
  bodyHeight: number;
  color: string;
  trimColor: string;
  wheelSet: WheelSetDefinition;
  pilotWheels?: AxleWheelDefinition;
  trailingWheels?: AxleWheelDefinition;
  stack?: StackDefinition;
  cab?: CabDefinition;
  headlamp?: HeadlampDefinition;
  pilot?: PilotDefinition;
  drivingRod: DrivingRodDefinition;
  steamEmitter: SteamEmitterDefinition;
};

export type TenderDefinition = {
  id: string;
  length: number;
  height: number;
  color: string;
};

export type RollingStockDefinition = {
  id: string;
  type: "tender" | "car";
  length: number;
  height: number;
  color: string;
};

export type TrainDefinition = {
  id: string;
  displayName: string;
  locomotive: LocomotiveDefinition;
  tender?: TenderDefinition;
  rollingStock: RollingStockDefinition[];
  baseSpeed: number;
};

export type TrackSwitchState = "main" | "siding";
export type GameMode = "levels" | "free-play";
export type PlayState = "running" | "crashed" | "rewinding" | "completed";
export type DriveCommand = "go" | "slow" | "stop";

export type LevelCheckpoint = {
  id: string;
  x: number;
  safeBranch: TrackSwitchState;
  promptIcon?: "switch" | "station" | "bridge" | "tunnel";
  promptText?: string;
  anticipationDistance?: number;
};

export type LevelScene = "yard" | "station" | "bridge" | "tunnel";

export type LevelGoalStep = {
  id: string;
  icon: "go" | "switch" | "station" | "finish";
  label: string;
};

export type StationStopRule = {
  startX: number;
  endX: number;
  requiredStopMs: number;
  maxEntrySpeed: number;
};

export type LevelDefinition = {
  id: string;
  order: number;
  name: string;
  width: number;
  startX: number;
  destinationX: number;
  forkLength: number;
  checkpoints: LevelCheckpoint[];
  baseSpeedMultiplier: number;
  tutorialCue: string;
  scene: LevelScene;
  crashPauseMs: number;
  rewindDurationMs: number;
  goals: LevelGoalStep[];
  stationStop?: StationStopRule;
};

export type SteamParticle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  lifeMs: number;
  maxLifeMs: number;
  alpha: number;
};

export type SimulationFrame = {
  elapsedMs: number;
  dtMs: number;
};

export type TrainHandlingProfile = {
  topSpeed: number;
  slowSpeed: number;
  acceleration: number;
  braking: number;
  rollingDrag: number;
  haulingClass: "light" | "medium" | "heavy";
};

export type TrainRuntimeState = {
  definition: TrainDefinition;
  profile: TrainHandlingProfile;
  x: number;
  y: number;
  speed: number;
  wheelRotationRad: number;
};

export type SteamTrainsSimulationState = {
  train: TrainRuntimeState;
  level: LevelDefinition;
  mode: GameMode;
  switchState: TrackSwitchState;
  checkpointDecisions: TrackSwitchState[];
  nextCheckpointIndex: number;
  playState: PlayState;
  driveCommand: DriveCommand;
  elapsedMs: number;
  crashAtMs: number | null;
  rewindStartMs: number | null;
  whistleAtMs: number | null;
  particles: SteamParticle[];
  nextParticleId: number;
  stationStopCompleted: boolean;
  stationStopProgressMs: number;
  stationStopPerfect: boolean;
  crashedThisRun: boolean;
  statusText: string;
};

export type LevelRunSummary = {
  completed: boolean;
  crashed: boolean;
  stationStopPerfect: boolean;
};

export type LevelProgressRecord = {
  stars: number;
  bestRun: LevelRunSummary;
};
