import type { LevelCheckpoint, SteamParticle, SteamTrainsSimulationState } from "./types";
import {
  drawLevelSceneDecor,
  drawPreviewBackdrop,
  drawSteamParticleRich,
  drawTrackAndBallast,
  drawTrainConsist,
  getPreviewPalette,
} from "./visuals";

const checkpointToScreenX = (checkpoint: LevelCheckpoint, state: SteamTrainsSimulationState, width: number) =>
  checkpoint.x - state.train.x + width * 0.35;

const drawCloudBands = (ctx: CanvasRenderingContext2D, width: number, elapsedMs: number) => {
  const scrollA = (elapsedMs * 0.01) % (width + 340);
  const scrollB = (elapsedMs * 0.018) % (width + 380);
  ctx.fillStyle = "rgba(255,255,255,0.52)";
  for (let i = 0; i < 4; i += 1) {
    const x = width - scrollA + i * 280;
    ctx.beginPath();
    ctx.ellipse(x, 86 + (i % 2) * 14, 130, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  for (let i = 0; i < 3; i += 1) {
    const x = width - scrollB + i * 340;
    ctx.beginPath();
    ctx.ellipse(x, 128 + (i % 2) * 12, 146, 36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawSceneDecor = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number) => {
  const railY = state.train.y + 56;
  drawLevelSceneDecor(ctx, state.level.scene, width, railY, getPreviewPalette());
};

const drawTrack = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number) => {
  const palette = getPreviewPalette();
  const railY = state.train.y + 56;
  drawTrackAndBallast(ctx, width, railY, palette);

  state.level.checkpoints.forEach((checkpoint, index) => {
    const switchX = checkpointToScreenX(checkpoint, state, width);
    const chosen = state.checkpointDecisions[index] ?? state.switchState;
    drawTrackAndBallast(ctx, 0, railY, palette, {
      includeSwitchStand: true,
      switchX,
      switchToSiding: chosen !== "main",
    });
  });
};

const drawHelperGlow = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number, helperCheckpointIndex: number) => {
  const checkpoint = state.level.checkpoints[helperCheckpointIndex];
  if (!checkpoint) {
    return;
  }

  const railY = state.train.y + 56;
  const x = checkpointToScreenX(checkpoint, state, width);
  const y = checkpoint.safeBranch === "main" ? railY - 26 : railY + 36;

  ctx.fillStyle = "rgba(250, 204, 21, 0.33)";
  ctx.beginPath();
  ctx.ellipse(x + 44, y, 68, 28, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawSteam = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, cameraX: number) => {
  const sorted = [...state.particles].sort((a, b) => a.radius - b.radius);
  sorted.forEach((particle) => drawSteamParticle(ctx, particle, cameraX));
};

const drawSteamParticle = (ctx: CanvasRenderingContext2D, particle: SteamParticle, cameraX: number) => {
  drawSteamParticleRich(ctx, particle, cameraX);
};

const drawLocomotive = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, cameraX: number) => {
  const palette = getPreviewPalette();
  const originX = state.train.x - cameraX;
  const originY = state.train.y + 4;
  drawTrainConsist(ctx, state.train.definition, {
    baseX: originX,
    baseY: originY,
    wheelRotationRad: state.train.wheelRotationRad,
    palette,
  });
};

const drawCelebration = (ctx: CanvasRenderingContext2D, width: number) => {
  const colors = ["#34d399", "#fbbf24", "#60a5fa", "#f472b6"];
  for (let i = 0; i < 16; i += 1) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(20 + i * 60, 20 + (i % 4) * 14, 18, 18);
  }
  ctx.fillStyle = "#052e16";
  ctx.font = "700 34px sans-serif";
  ctx.fillText("Great job!", Math.max(26, width * 0.04), 112);
};

type RenderOptions = {
  helperCheckpointIndex?: number | null;
  showCelebration?: boolean;
};

export const renderScene = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, options: RenderOptions = {}) => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const cameraX = state.train.x - width * 0.35;

  ctx.clearRect(0, 0, width, height);

  drawPreviewBackdrop(ctx, width, height, getPreviewPalette());
  drawCloudBands(ctx, width, state.elapsedMs);
  drawSceneDecor(ctx, state, width);
  drawTrack(ctx, state, width);

  if (options.helperCheckpointIndex !== undefined && options.helperCheckpointIndex !== null) {
    drawHelperGlow(ctx, state, width, options.helperCheckpointIndex);
  }

  drawLocomotive(ctx, state, cameraX);
  drawSteam(ctx, state, cameraX);

  if (state.playState === "crashed") {
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.fillRect(0, 0, width, height);
  }

  if (state.playState === "rewinding") {
    ctx.fillStyle = "rgba(30, 41, 59, 0.28)";
    ctx.fillRect(0, 0, width, height);
  }

  if (options.showCelebration) {
    drawCelebration(ctx, width);
  }
};
