import type { SteamTrainsSimulationState } from "./types";

const SKY = "#c4e9ff";
const GROUND = "#6b8e23";

const drawTrack = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number, height: number) => {
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

  const switchX = state.level.switchX - state.train.x + width * 0.34;
  ctx.strokeStyle = state.switchState === state.level.safeBranch ? "#22c55e" : "#f97316";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(switchX, railY + 2);
  ctx.lineTo(switchX + state.level.forkLength, railY + (state.switchState === "main" ? 2 : 54));
  ctx.stroke();
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

const drawLocomotive = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, cameraX: number) => {
  const loco = state.train.definition.locomotive;
  const originX = state.train.x - cameraX;
  const originY = state.train.y;

  ctx.fillStyle = loco.color;
  ctx.fillRect(originX, originY - loco.bodyHeight, loco.bodyLength, loco.bodyHeight);
  ctx.fillStyle = loco.trimColor;
  ctx.fillRect(originX + 18, originY - loco.bodyHeight - 18, 54, 20);
  ctx.fillRect(originX + 42, originY - loco.bodyHeight - 38, 24, 26);

  if (state.train.definition.tender) {
    const tender = state.train.definition.tender;
    const tenderX = originX + loco.bodyLength + 16;
    ctx.fillStyle = tender.color;
    ctx.fillRect(tenderX, originY - tender.height, tender.length, tender.height);
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

  const rod = loco.drivingRod;
  const crankWheel = wheelCenters[Math.min(wheelCenters.length - 1, Math.max(0, rod.wheelIndex))];
  const crankX = crankWheel.x + Math.cos(state.train.wheelRotationRad) * rod.crankRadius;
  const crankY = crankWheel.y + Math.sin(state.train.wheelRotationRad) * rod.crankRadius;
  const anchorX = wheelCenters[0].x - rod.rodLength / 2;
  const anchorY = crankWheel.y + rod.anchorOffsetY;

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = rod.thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.lineTo(crankX, crankY);
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(crankX, crankY, 6, 0, Math.PI * 2);
  ctx.fill();
};

export const renderScene = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState) => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const cameraX = state.train.x - width * 0.34;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, width, height * 0.75);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, height * 0.75, width, height * 0.25);

  drawTrack(ctx, state, width, height);
  drawLocomotive(ctx, state, cameraX);
  drawSteam(ctx, state, cameraX);

  if (state.playState === "crashed") {
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff7ed";
    ctx.font = "700 34px sans-serif";
    ctx.fillText("Oops! Switch was wrong", 40, 130);
  }
};
