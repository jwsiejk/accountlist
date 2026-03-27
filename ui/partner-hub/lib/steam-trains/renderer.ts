import type { LevelCheckpoint, SteamParticle, SteamTrainsSimulationState } from "./types";
import { drawPreviewBackdrop, drawSteamParticleRich, drawTrackAndBallast, drawTrainConsist, getPreviewPalette } from "./visuals";

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
  const horizonY = state.train.y - 136;

  ctx.fillStyle = "rgba(57, 92, 40, 0.44)";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 170, horizonY + 70);
    ctx.quadraticCurveTo(i * 170 + 80, horizonY + 16, i * 170 + 160, horizonY + 70);
    ctx.lineTo(i * 170 + 160, railY + 144);
    ctx.lineTo(i * 170, railY + 144);
    ctx.closePath();
    ctx.fill();
  }

  if (state.level.scene === "yard") {
    ctx.fillStyle = "#7f8b98";
    ctx.fillRect(width * 0.05, railY - 140, 220, 94);
    ctx.fillStyle = "#5f6d7d";
    ctx.fillRect(width * 0.04, railY - 154, 238, 16);
    ctx.fillStyle = "#475569";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(width * 0.07 + i * 42, railY - 120, 25, 38);
    }
    ctx.fillStyle = "#374151";
    ctx.fillRect(width * 0.36, railY - 44, 180, 8);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillRect(width * 0.37 + i * 56, railY - 72, 8, 28);
    }
  }

  if (state.level.scene === "station") {
    ctx.fillStyle = "#f2f6fc";
    ctx.fillRect(width * 0.5, railY - 164, 330, 112);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(width * 0.47, railY - 180, 380, 20);
    ctx.fillStyle = "#334155";
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(width * 0.52 + i * 52, railY - 142, 24, 40);
    }
    ctx.fillStyle = "#d8e8ff";
    ctx.fillRect(width * 0.52, railY - 96, 310, 22);
    ctx.fillStyle = "#a7b4c5";
    ctx.fillRect(width * 0.44, railY - 6, 420, 10);
  }

  if (state.level.scene === "bridge") {
    ctx.fillStyle = "#334155";
    ctx.fillRect(width * 0.06, railY + 8, width * 0.88, 26);
    ctx.fillStyle = "#475569";
    for (let i = 0; i < 10; i += 1) {
      const x = width * 0.1 + i * (width * 0.078);
      ctx.fillRect(x, railY + 34, 12, 72);
      ctx.beginPath();
      ctx.moveTo(x + 6, railY + 34);
      ctx.lineTo(x + 52, railY + 106);
      ctx.lineTo(x + 44, railY + 106);
      ctx.lineTo(x, railY + 40);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(0, railY + 112, width, 130);
  }

  if (state.level.scene === "tunnel") {
    ctx.fillStyle = "#4b5563";
    ctx.beginPath();
    ctx.arc(width * 0.73, railY - 22, 144, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.73 - 144, railY - 22, 288, 126);
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(width * 0.73, railY - 22, 110, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.73 - 110, railY - 22, 220, 106);
  }
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
