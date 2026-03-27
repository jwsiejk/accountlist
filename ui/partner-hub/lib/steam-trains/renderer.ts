import type { AxleWheelDefinition, LevelCheckpoint, SteamParticle, SteamTrainsSimulationState } from "./types";
import { getLocomotiveSilhouette, getRodCyclePhase } from "./visuals";

const SKY_TOP = "#9fd5ff";
const SKY_HORIZON = "#dff3ff";
const GROUND_TOP = "#8fb74d";
const GROUND_BASE = "#5f7f2d";

const checkpointToScreenX = (checkpoint: LevelCheckpoint, state: SteamTrainsSimulationState, width: number) =>
  checkpoint.x - state.train.x + width * 0.4;

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.76);
  skyGradient.addColorStop(0, SKY_TOP);
  skyGradient.addColorStop(0.7, SKY_HORIZON);
  skyGradient.addColorStop(1, "#e9f7ff");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.76);

  const groundGradient = ctx.createLinearGradient(0, height * 0.68, 0, height);
  groundGradient.addColorStop(0, GROUND_TOP);
  groundGradient.addColorStop(1, GROUND_BASE);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, height * 0.68, width, height * 0.32);
};

const drawCloudBands = (ctx: CanvasRenderingContext2D, width: number, elapsedMs: number) => {
  const scrollA = (elapsedMs * 0.01) % (width + 340);
  const scrollB = (elapsedMs * 0.018) % (width + 380);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 4; i += 1) {
    const x = width - scrollA + i * 280;
    ctx.beginPath();
    ctx.ellipse(x, 92 + (i % 2) * 14, 120, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.33)";
  for (let i = 0; i < 3; i += 1) {
    const x = width - scrollB + i * 340;
    ctx.beginPath();
    ctx.ellipse(x, 132 + (i % 2) * 12, 140, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawSceneDecor = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number) => {
  const railY = state.train.y + 52;
  const horizonY = state.train.y - 128;

  ctx.fillStyle = "rgba(51, 85, 36, 0.48)";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 170, horizonY + 70);
    ctx.quadraticCurveTo(i * 170 + 80, horizonY + 20, i * 170 + 160, horizonY + 70);
    ctx.lineTo(i * 170 + 160, railY + 140);
    ctx.lineTo(i * 170, railY + 140);
    ctx.closePath();
    ctx.fill();
  }

  if (state.level.scene === "yard") {
    ctx.fillStyle = "#7f8b98";
    ctx.fillRect(width * 0.06, railY - 130, 190, 86);
    ctx.fillStyle = "#5f6d7d";
    ctx.fillRect(width * 0.05, railY - 140, 208, 14);
    ctx.fillStyle = "#475569";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(width * 0.08 + i * 40, railY - 112, 24, 34);
    }
  }

  if (state.level.scene === "station") {
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(width * 0.52, railY - 150, 300, 100);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(width * 0.5, railY - 165, 340, 18);
    ctx.fillStyle = "#334155";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(width * 0.54 + i * 52, railY - 130, 24, 34);
    }
    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(width * 0.54, railY - 86, 286, 18);
  }

  if (state.level.scene === "bridge") {
    ctx.fillStyle = "#334155";
    ctx.fillRect(width * 0.08, railY + 8, width * 0.84, 24);
    ctx.fillStyle = "#475569";
    for (let i = 0; i < 9; i += 1) {
      const x = width * 0.11 + i * (width * 0.08);
      ctx.fillRect(x, railY + 32, 12, 62);
      ctx.beginPath();
      ctx.moveTo(x + 6, railY + 32);
      ctx.lineTo(x + 48, railY + 96);
      ctx.lineTo(x + 40, railY + 96);
      ctx.lineTo(x, railY + 38);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(0, railY + 102, width, 130);
  }

  if (state.level.scene === "tunnel") {
    ctx.fillStyle = "#4b5563";
    ctx.beginPath();
    ctx.arc(width * 0.72, railY - 24, 136, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.72 - 136, railY - 24, 272, 120);
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(width * 0.72, railY - 24, 102, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.72 - 102, railY - 24, 204, 102);
  }
};

const drawTrack = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number) => {
  const railY = state.train.y + 52;

  ctx.fillStyle = "#7c6450";
  ctx.fillRect(0, railY - 2, width, 38);
  ctx.fillStyle = "#8e7961";
  for (let x = -40; x < width + 50; x += 14) {
    ctx.fillRect(x, railY + 22, 8, 4);
  }

  const tieSpacing = 28;
  for (let x = -20; x < width + 34; x += tieSpacing) {
    ctx.fillStyle = "#5b3f2a";
    ctx.fillRect(x, railY + 1, 22, 18);
    ctx.fillStyle = "#3f2d1e";
    ctx.fillRect(x + 1, railY + 13, 20, 3);
  }

  const railGradient = ctx.createLinearGradient(0, railY - 4, 0, railY + 18);
  railGradient.addColorStop(0, "#eef2f7");
  railGradient.addColorStop(0.6, "#9ca3af");
  railGradient.addColorStop(1, "#4b5563");
  ctx.fillStyle = railGradient;
  ctx.fillRect(0, railY - 4, width, 7);
  ctx.fillRect(0, railY + 13, width, 7);

  state.level.checkpoints.forEach((checkpoint, index) => {
    const switchX = checkpointToScreenX(checkpoint, state, width);
    const chosen = state.checkpointDecisions[index] ?? state.switchState;
    const targetY = chosen === "main" ? railY + 2 : railY + 56;

    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(switchX - 8, railY + 2);
    ctx.lineTo(switchX + state.level.forkLength, targetY);
    ctx.stroke();

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(switchX - 8, railY + 2);
    ctx.lineTo(switchX + state.level.forkLength, targetY - 2);
    ctx.stroke();

    ctx.fillStyle = "#374151";
    ctx.fillRect(switchX - 6, railY - 26, 6, 22);
    ctx.fillStyle = chosen === checkpoint.safeBranch ? "#22c55e" : "#f97316";
    ctx.beginPath();
    ctx.moveTo(switchX, railY - 24);
    ctx.lineTo(switchX + 18, railY - 18);
    ctx.lineTo(switchX, railY - 12);
    ctx.closePath();
    ctx.fill();
  });
};

const drawHelperGlow = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, width: number, helperCheckpointIndex: number) => {
  const checkpoint = state.level.checkpoints[helperCheckpointIndex];
  if (!checkpoint) {
    return;
  }

  const railY = state.train.y + 52;
  const x = checkpointToScreenX(checkpoint, state, width);
  const y = checkpoint.safeBranch === "main" ? railY - 26 : railY + 36;

  ctx.fillStyle = "rgba(250, 204, 21, 0.33)";
  ctx.beginPath();
  ctx.ellipse(x + 44, y, 68, 28, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawSteam = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, cameraX: number) => {
  const sorted = [...state.particles].sort((a, b) => a.radius - b.radius);
  sorted.forEach((particle) => {
    drawSteamParticle(ctx, particle, cameraX);
  });
};

const drawSteamParticle = (ctx: CanvasRenderingContext2D, particle: SteamParticle, cameraX: number) => {
  const px = particle.x - cameraX;
  const baseAlpha = Math.max(0.05, particle.alpha);

  const body = ctx.createRadialGradient(px - particle.radius * 0.2, particle.y - particle.radius * 0.2, 1, px, particle.y, particle.radius * 1.2);
  body.addColorStop(0, `rgba(255,255,255,${baseAlpha})`);
  body.addColorStop(0.65, `rgba(226,232,240,${baseAlpha * 0.74})`);
  body.addColorStop(1, `rgba(203,213,225,${baseAlpha * 0.12})`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(px, particle.y, particle.radius * 1.15, 0, Math.PI * 2);
  ctx.fill();
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
    const y = originY - 1 + (wheelDef.yOffset ?? 0);

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(x, y, wheelDef.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, wheelDef.radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    const angle = rotation + index * (Math.PI / 2);
    ctx.strokeStyle = "#a8b0bf";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * (wheelDef.radius - 4), y - Math.sin(angle) * (wheelDef.radius - 4));
    ctx.lineTo(x + Math.cos(angle) * (wheelDef.radius - 4), y + Math.sin(angle) * (wheelDef.radius - 4));
    ctx.stroke();
  }
};

const drawCarCoupler = (ctx: CanvasRenderingContext2D, leftX: number, rightX: number, baseY: number) => {
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(leftX, baseY - 8);
  ctx.lineTo((leftX + rightX) / 2, baseY - 5);
  ctx.lineTo(rightX, baseY - 8);
  ctx.stroke();
  ctx.lineCap = "butt";
};

const drawLocomotive = (ctx: CanvasRenderingContext2D, state: SteamTrainsSimulationState, cameraX: number) => {
  const loco = state.train.definition.locomotive;
  const originX = state.train.x - cameraX;
  const originY = state.train.y;
  const silhouette = getLocomotiveSilhouette(loco);

  const pilot = loco.pilot ?? { length: 44, height: 28, color: "#374151", ribCount: 5 };
  ctx.fillStyle = pilot.color;
  ctx.beginPath();
  ctx.moveTo(originX - pilot.length, originY - 1);
  ctx.lineTo(originX + 6, originY + 2);
  ctx.lineTo(originX + 6, originY - pilot.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  for (let rib = 0; rib < pilot.ribCount; rib += 1) {
    const progress = rib / Math.max(1, pilot.ribCount - 1);
    const ribX = originX - pilot.length + progress * pilot.length;
    ctx.beginPath();
    ctx.moveTo(ribX, originY - 1);
    ctx.lineTo(ribX + 10, originY - pilot.height + 4);
    ctx.stroke();
  }

  const chassisGradient = ctx.createLinearGradient(originX, originY + 2, originX, originY - loco.bodyHeight);
  chassisGradient.addColorStop(0, "#0f172a");
  chassisGradient.addColorStop(0.45, loco.color);
  chassisGradient.addColorStop(1, "#374151");

  ctx.fillStyle = chassisGradient;
  ctx.fillRect(originX + 10, originY + 1 + silhouette.runningBoardY, silhouette.boilerLength + 58, loco.bodyHeight * 0.36);

  ctx.fillStyle = loco.color;
  ctx.beginPath();
  ctx.roundRect(originX + 18, originY + silhouette.boilerTop, silhouette.boilerLength, silhouette.boilerHeight, 18);
  ctx.fill();

  const smokeboxX = originX + silhouette.smokeboxCenterX;
  const smokeboxY = originY + silhouette.boilerTop + silhouette.boilerHeight / 2;
  const smokeboxFace = ctx.createRadialGradient(smokeboxX - 4, smokeboxY - 2, 2, smokeboxX, smokeboxY, silhouette.smokeboxRadius);
  smokeboxFace.addColorStop(0, "#4b5563");
  smokeboxFace.addColorStop(1, "#111827");
  ctx.fillStyle = smokeboxFace;
  ctx.beginPath();
  ctx.arc(smokeboxX, smokeboxY, silhouette.smokeboxRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(smokeboxX, smokeboxY, silhouette.smokeboxRadius - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = loco.trimColor;
  ctx.fillRect(originX + 24, originY + silhouette.boilerTop - 10, silhouette.boilerLength * 0.62, 7);

  const stack = loco.stack ?? { width: 20, height: 36, flareWidth: 32, flareHeight: 10, offsetX: 68, offsetY: -102 };
  const stackX = originX + stack.offsetX;
  const stackY = originY + stack.offsetY;
  const stackGradient = ctx.createLinearGradient(stackX, stackY, stackX, stackY + stack.height + stack.flareHeight);
  stackGradient.addColorStop(0, "#0b1222");
  stackGradient.addColorStop(1, "#475569");
  ctx.fillStyle = stackGradient;
  ctx.beginPath();
  ctx.roundRect(stackX, stackY, stack.width, stack.height, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(stackX - (stack.flareWidth - stack.width) / 2, stackY - stack.flareHeight, stack.flareWidth, stack.flareHeight + 2, 5);
  ctx.fill();

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
  const cabY = originY - cab.height - 10;
  ctx.fillStyle = loco.color;
  ctx.beginPath();
  ctx.moveTo(cabX, cabY + cab.height);
  ctx.lineTo(cabX + cab.width, cabY + cab.height);
  ctx.lineTo(cabX + cab.width, cabY + 10);
  ctx.lineTo(cabX + cab.width - 18, cabY);
  ctx.lineTo(cabX + 16, cabY);
  ctx.lineTo(cabX, cabY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(cabX - cab.roofOverhang, cabY - cab.roofHeight, cab.width + cab.roofOverhang * 2, cab.roofHeight);
  ctx.fillStyle = "#cfe9ff";
  ctx.fillRect(cabX + 12, cabY + 14, cab.windowWidth, cab.windowHeight);
  ctx.fillRect(cabX + 40, cabY + 14, cab.windowWidth, cab.windowHeight);

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
  ctx.ellipse(lampX - 22, lampY, lamp.radius * 2.6, lamp.radius * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lamp.rimColor;
  ctx.beginPath();
  ctx.arc(lampX, lampY, lamp.radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(lampX, lampY, lamp.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  if (loco.pilotWheels) {
    drawAuxWheelSet(ctx, originX, originY, loco.pilotWheels, state.train.wheelRotationRad * 0.82);
  }

  const wheelSet = loco.wheelSet;
  const wheelCenters = Array.from({ length: wheelSet.count }).map((_, index) => {
    const x = originX + wheelSet.offsetX + index * wheelSet.spacing;
    const y = originY - 1;

    const wheelGradient = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, wheelSet.radius);
    wheelGradient.addColorStop(0, "#d7dde6");
    wheelGradient.addColorStop(0.22, "#a9b3c3");
    wheelGradient.addColorStop(1, "#111827");
    ctx.fillStyle = wheelGradient;
    ctx.beginPath();
    ctx.arc(x, y, wheelSet.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, wheelSet.radius - 3, 0, Math.PI * 2);
    ctx.stroke();

    const spokeCount = 9;
    ctx.strokeStyle = "#c7d2e0";
    ctx.lineWidth = 2;
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
    drawAuxWheelSet(ctx, originX, originY, loco.trailingWheels, state.train.wheelRotationRad * 0.74);
  }

  const rod = loco.drivingRod;
  const phase = getRodCyclePhase(state.train.wheelRotationRad);
  const crankWheel = wheelCenters[Math.min(wheelCenters.length - 1, Math.max(0, rod.wheelIndex))];
  const leadWheel = wheelCenters[0];
  const trailingWheel = wheelCenters[wheelCenters.length - 1];

  const leftCrankX = crankWheel.x + Math.cos(phase) * rod.crankRadius;
  const leftCrankY = crankWheel.y + Math.sin(phase) * rod.crankRadius;
  const rightCrankX = leadWheel.x + Math.cos(phase + 0.18) * (rod.crankRadius * 0.92);
  const rightCrankY = leadWheel.y + Math.sin(phase + 0.18) * (rod.crankRadius * 0.92);

  const pistonX = leadWheel.x - rod.rodLength * 0.45;
  const pistonY = crankWheel.y + rod.anchorOffsetY;
  ctx.fillStyle = "#475569";
  ctx.fillRect(pistonX - 24, pistonY - 8, 24, 16);

  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = rod.thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pistonX, pistonY);
  ctx.lineTo(leftCrankX, leftCrankY);
  ctx.lineTo(trailingWheel.x + 10, trailingWheel.y - 2);
  ctx.stroke();

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = Math.max(3, rod.thickness - 2);
  ctx.beginPath();
  ctx.moveTo(rightCrankX, rightCrankY);
  ctx.lineTo(leftCrankX, leftCrankY);
  ctx.lineTo(leadWheel.x + 10, leadWheel.y - 2);
  ctx.stroke();

  ctx.fillStyle = "#f8d14b";
  [
    [leftCrankX, leftCrankY],
    [rightCrankX, rightCrankY],
    [pistonX, pistonY],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  let rollingX = originX + loco.bodyLength + 20;
  let previousCouplerX = originX + loco.bodyLength + 5;

  if (state.train.definition.tender) {
    const tender = state.train.definition.tender;
    const tenderX = rollingX;
    const tenderY = originY - tender.height;

    const tenderGradient = ctx.createLinearGradient(tenderX, tenderY, tenderX, originY);
    tenderGradient.addColorStop(0, tender.color);
    tenderGradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = tenderGradient;
    ctx.fillRect(tenderX, tenderY, tender.length, tender.height);
    ctx.fillStyle = "#111827";
    ctx.fillRect(tenderX + 8, tenderY - 14, tender.length - 16, 14);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(tenderX + 16, tenderY + 10, tender.length - 32, 8);

    [36, tender.length - 44].forEach((offset) => {
      const x = tenderX + offset;
      const y = originY - 2;
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.stroke();
    });

    drawCarCoupler(ctx, previousCouplerX, tenderX + 2, originY);
    previousCouplerX = tenderX + tender.length - 2;
    rollingX += tender.length + 18;
  }

  state.train.definition.rollingStock.forEach((car, carIndex) => {
    const carX = rollingX;
    const carY = originY - car.height;

    const carGradient = ctx.createLinearGradient(carX, carY, carX, originY);
    carGradient.addColorStop(0, car.color);
    carGradient.addColorStop(1, "#1f2937");
    ctx.fillStyle = carGradient;
    ctx.fillRect(carX, carY, car.length, car.height);

    if (state.train.definition.id.includes("passenger")) {
      ctx.fillStyle = "#fef3c7";
      const windowCount = Math.max(4, Math.floor(car.length / 28));
      for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
        const wx = carX + 10 + windowIndex * ((car.length - 20) / windowCount);
        ctx.fillRect(wx, carY + 10, 11, 11);
      }
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(carX + 10, carY + 10, car.length - 20, Math.min(20, car.height * 0.46));
      for (let rib = 0; rib < 4; rib += 1) {
        ctx.fillStyle = "rgba(226,232,240,0.22)";
        ctx.fillRect(carX + 14 + rib * ((car.length - 36) / 4), carY + 10, 4, car.height - 18);
      }
    }

    [24, car.length - 26].forEach((offset) => {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(carX + offset, originY - 2, 14, 0, Math.PI * 2);
      ctx.fill();
    });

    drawCarCoupler(ctx, previousCouplerX, carX + 2, originY);
    previousCouplerX = carX + car.length - 2;
    rollingX += car.length + 16;

    if (carIndex === state.train.definition.rollingStock.length - 1) {
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(previousCouplerX + 4, originY - 18, 5, 10);
    }
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
  const cameraX = state.train.x - width * 0.4;

  ctx.clearRect(0, 0, width, height);

  drawBackground(ctx, width, height);
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
