import type { AxleWheelDefinition, LevelCheckpoint, SteamTrainsSimulationState } from "./types";

const SKY = "#c4e9ff";
const GROUND = "#6b8e23";

type RenderOptions = {
  helperCheckpointIndex?: number | null;
  showCelebration?: boolean;
};

const checkpointToScreenX = (checkpoint: LevelCheckpoint, state: SteamTrainsSimulationState, width: number) =>
  checkpoint.x - state.train.x + width * 0.34;

const drawSceneDecor = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number, height: number) => {
  const railY = state.train.y + 34;
  if (state.level.scene === "station") {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(width * 0.56, railY - 120, 180, 84);
    ctx.fillStyle = "#475569";
    ctx.fillRect(width * 0.55, railY - 130, 200, 16);
  }

  if (state.level.scene === "bridge") {
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(width * 0.3, railY + 18);
    ctx.lineTo(width * 0.7, railY + 18);
    ctx.stroke();
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(width * 0.15, railY + 80);
    ctx.lineTo(width * 0.85, railY + 80);
    ctx.stroke();
  }

  if (state.level.scene === "tunnel") {
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.arc(width * 0.72, railY - 16, 92, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.72 - 92, railY - 16, 184, 80);
  }
};

const drawTrack = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number) => {
  const railY = state.train.y + 40;
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, railY);
  ctx.lineTo(width, railY);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, railY + 14);
  ctx.lineTo(width, railY + 14);
  ctx.stroke();

  for (let x = 0; x < width; x += 36) {
    ctx.strokeStyle = "#7c5a35";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, railY + 2);
    ctx.lineTo(x + 16, railY + 16);
    ctx.stroke();
  }

  state.level.checkpoints.forEach((checkpoint, index) => {
    const switchX = checkpointToScreenX(checkpoint, state, width);
    const chosen = state.checkpointDecisions[index] ?? state.switchState;
    ctx.strokeStyle = chosen === checkpoint.safeBranch ? "#22c55e" : "#f97316";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(switchX, railY + 2);
    ctx.lineTo(switchX + state.level.forkLength, railY + (chosen === "main" ? 2 : 54));
    ctx.stroke();
  });
};

const drawHelperGlow = (
  ctx: CanvasRenderingContext2D,
  state: SteamTrainsSimulationState,
  width: number,
  helperCheckpointIndex: number,
) => {
  const checkpoint = state.level.checkpoints[helperCheckpointIndex];
  if (!checkpoint) {
    return;
  }

  const railY = state.train.y + 48;
  const x = checkpointToScreenX(checkpoint, state, width);
  const y = checkpoint.safeBranch === "main" ? railY - 20 : railY + 30;

  ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
  ctx.beginPath();
  ctx.ellipse(x + 44, y, 62, 26, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawSteam = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, cameraX: number) => {
  state.particles.forEach((particle) => {
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(particle.x - cameraX, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

const drawAuxWheelSet = (
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  wheelDef: AxleWheelDefinition,
  rotation: number,
) => {
  for (let index = 0; index < wheelDef.count; index += 1) {
    const x = originX + wheelDef.offsetX + index * wheelDef.spacing;
    const y = originY - 4 + (wheelDef.yOffset ?? 0);

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(x, y, wheelDef.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, wheelDef.radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    const angle = rotation + index * (Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * (wheelDef.radius - 4), y - Math.sin(angle) * (wheelDef.radius - 4));
    ctx.lineTo(x + Math.cos(angle) * (wheelDef.radius - 4), y + Math.sin(angle) * (wheelDef.radius - 4));
    ctx.stroke();
  }
};

const drawLocomotive = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, cameraX: number) => {
  const loco = state.train.definition.locomotive;
  const originX = state.train.x - cameraX;
  const originY = state.train.y;
  const boilerHeight = loco.bodyHeight * 0.74;
  const boilerTop = originY - loco.bodyHeight + 6;

  const pilot = loco.pilot ?? {
    length: 44,
    height: 28,
    color: "#374151",
    ribCount: 5,
  };

  ctx.fillStyle = pilot.color;
  ctx.beginPath();
  ctx.moveTo(originX - pilot.length, originY - 2);
  ctx.lineTo(originX, originY - pilot.height);
  ctx.lineTo(originX, originY - 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  for (let rib = 0; rib < pilot.ribCount; rib += 1) {
    const progress = rib / Math.max(1, pilot.ribCount - 1);
    const ribX = originX - pilot.length + progress * pilot.length;
    ctx.beginPath();
    ctx.moveTo(ribX, originY - 4);
    ctx.lineTo(ribX + 10, originY - pilot.height + 2);
    ctx.stroke();
  }

  ctx.fillStyle = loco.color;
  ctx.fillRect(originX + 4, originY - loco.bodyHeight + boilerHeight * 0.45, loco.bodyLength * 0.7, loco.bodyHeight * 0.55);

  ctx.beginPath();
  ctx.ellipse(
    originX + loco.bodyLength * 0.38,
    boilerTop + boilerHeight * 0.52,
    loco.bodyLength * 0.35,
    boilerHeight * 0.5,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = loco.trimColor;
  ctx.fillRect(originX + 18, originY - loco.bodyHeight - 8, loco.bodyLength * 0.32, 8);

  const stack = loco.stack ?? {
    width: 20,
    height: 36,
    flareWidth: 32,
    flareHeight: 10,
    offsetX: 68,
    offsetY: -102,
  };
  const stackX = originX + stack.offsetX;
  const stackY = originY + stack.offsetY;
  ctx.fillStyle = "#111827";
  ctx.fillRect(stackX, stackY, stack.width, stack.height);
  ctx.fillRect(stackX - (stack.flareWidth - stack.width) / 2, stackY - stack.flareHeight, stack.flareWidth, stack.flareHeight);

  const cab = loco.cab ?? {
    width: 82,
    height: 62,
    roofOverhang: 12,
    roofHeight: 12,
    offsetX: loco.bodyLength - 94,
    windowWidth: 18,
    windowHeight: 16,
  };

  const cabX = originX + cab.offsetX;
  const cabY = originY - cab.height - 8;
  ctx.fillStyle = loco.color;
  ctx.fillRect(cabX, cabY, cab.width, cab.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(cabX - cab.roofOverhang, cabY - cab.roofHeight, cab.width + cab.roofOverhang * 2, cab.roofHeight);
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(cabX + 12, cabY + 12, cab.windowWidth, cab.windowHeight);
  ctx.fillRect(cabX + 40, cabY + 12, cab.windowWidth, cab.windowHeight);

  const lamp = loco.headlamp ?? {
    radius: 10,
    offsetX: 6,
    offsetY: -58,
    rimColor: "#f59e0b",
    glowColor: "rgba(255, 244, 180, 0.6)",
  };

  const lampX = originX + lamp.offsetX;
  const lampY = originY + lamp.offsetY;
  ctx.fillStyle = lamp.glowColor;
  ctx.beginPath();
  ctx.ellipse(lampX - 18, lampY, lamp.radius * 2.1, lamp.radius * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lamp.rimColor;
  ctx.beginPath();
  ctx.arc(lampX, lampY, lamp.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(lampX, lampY, lamp.radius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  if (loco.pilotWheels) {
    drawAuxWheelSet(ctx, originX, originY, loco.pilotWheels, state.train.wheelRotationRad * 0.8);
  }

  const wheelSet = loco.wheelSet;
  const wheelCenters = Array.from({ length: wheelSet.count }).map((_, index) => {
    const x = originX + wheelSet.offsetX + index * wheelSet.spacing;
    const y = originY - 4;

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(x, y, wheelSet.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, wheelSet.radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    const spokeCount = 8;
    for (let spoke = 0; spoke < spokeCount; spoke += 1) {
      const angle = state.train.wheelRotationRad + (Math.PI * 2 * spoke) / spokeCount;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * (wheelSet.radius - 4), y + Math.sin(angle) * (wheelSet.radius - 4));
      ctx.stroke();
    }

    return { x, y };
  });

  if (loco.trailingWheels) {
    drawAuxWheelSet(ctx, originX, originY, loco.trailingWheels, state.train.wheelRotationRad * 0.7);
  }

  const rod = loco.drivingRod;
  const crankWheel = wheelCenters[Math.min(wheelCenters.length - 1, Math.max(0, rod.wheelIndex))];
  const leadWheel = wheelCenters[0];
  const trailingWheel = wheelCenters[wheelCenters.length - 1];
  const pistonX = leadWheel.x - rod.rodLength / 2;
  const pistonY = crankWheel.y + rod.anchorOffsetY;
  const crankX = crankWheel.x + Math.cos(state.train.wheelRotationRad) * rod.crankRadius;
  const crankY = crankWheel.y + Math.sin(state.train.wheelRotationRad) * rod.crankRadius;

  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = rod.thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pistonX, pistonY);
  ctx.lineTo(crankX, crankY);
  ctx.lineTo(trailingWheel.x + 10, trailingWheel.y - 2);
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(crankX, crankY, 6, 0, Math.PI * 2);
  ctx.fill();

  if (state.train.definition.tender) {
    const tender = state.train.definition.tender;
    const tenderX = originX + loco.bodyLength + 20;
    const tenderY = originY - tender.height;

    ctx.fillStyle = tender.color;
    ctx.fillRect(tenderX, tenderY, tender.length, tender.height);
    ctx.fillStyle = "#111827";
    ctx.fillRect(tenderX + 10, tenderY - 14, tender.length - 24, 14);
    ctx.fillRect(tenderX - 2, tenderY + 10, 8, tender.height - 10);

    const tenderWheelRadius = 18;
    [36, tender.length - 44].forEach((offset) => {
      const x = tenderX + offset;
      const y = originY - 2;
      ctx.fillStyle = "#0b0f19";
      ctx.beginPath();
      ctx.arc(x, y, tenderWheelRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
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

export const renderScene = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, options: RenderOptions = {}) => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const cameraX = state.train.x - width * 0.34;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, width, height * 0.75);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, height * 0.75, width, height * 0.25);

  drawSceneDecor(ctx, state, width, height);
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
