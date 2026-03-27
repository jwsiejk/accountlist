import type { AxleWheelDefinition, LocomotiveDefinition, SteamParticle, TrainDefinition } from "./types";

export const LOCOMOTIVE_TO_TENDER_GAP = 20;
export const CAR_GAP = 10;

export type TrainLayout = {
  fullConsistLength: number;
  locomotiveStart: number;
  tenderStart: number;
  rollingStockStart: number;
  scale: number;
};

export type LocomotiveSilhouette = {
  boilerTop: number;
  boilerHeight: number;
  boilerLength: number;
  runningBoardY: number;
  cabRoofY: number;
  smokeboxRadius: number;
  smokeboxCenterX: number;
};

export type TrainPreviewPalette = {
  skyTop: string;
  skyHorizon: string;
  groundTop: string;
  groundBottom: string;
  railBed: string;
  ballastLight: string;
  ballastDark: string;
  railTop: string;
  railBottom: string;
  tieTop: string;
  tieShadow: string;
  wheelFill: string;
  wheelRim: string;
  wheelSpoke: string;
  runningBoard: string;
  stack: string;
  smokebox: string;
  brass: string;
  metalDark: string;
};

const DEFAULT_PREVIEW_PALETTE: TrainPreviewPalette = {
  skyTop: "#9ed3fa",
  skyHorizon: "#edf7ff",
  groundTop: "#8fae57",
  groundBottom: "#5f7431",
  railBed: "#7f6449",
  ballastLight: "#a98a6c",
  ballastDark: "#6e533b",
  railTop: "#f1f5f9",
  railBottom: "#7f8b97",
  tieTop: "#5d4029",
  tieShadow: "#3c2a1b",
  wheelFill: "#0f172a",
  wheelRim: "#d0d8e4",
  wheelSpoke: "#a1aebe",
  runningBoard: "#0f172a",
  stack: "#172033",
  smokebox: "#1a212d",
  brass: "#d8ad3f",
  metalDark: "#273241",
};

export type TrackRenderOptions = {
  includeSwitchStand?: boolean;
  switchX?: number;
  switchToSiding?: boolean;
};

export type TrainArtRenderOptions = {
  baseX: number;
  baseY: number;
  scale?: number;
  wheelRotationRad?: number;
  palette?: TrainPreviewPalette;
  railTopY?: number;
  smokeIntensity?: number;
};

export const getTrainConsistLength = (train: TrainDefinition, gaps = { locomotiveToTender: LOCOMOTIVE_TO_TENDER_GAP, carGap: CAR_GAP }) => {
  const tenderLength = train.tender?.length ?? 0;
  const rollingStockLength = train.rollingStock.reduce((total, car) => total + car.length, 0);
  const rollingStockSpacing = Math.max(0, train.rollingStock.length - 1) * gaps.carGap;

  return (
    train.locomotive.bodyLength +
    (train.tender ? gaps.locomotiveToTender + tenderLength : 0) +
    (train.rollingStock.length > 0 ? gaps.locomotiveToTender : 0) +
    rollingStockLength +
    rollingStockSpacing
  );
};

export const getPreviewPalette = (): TrainPreviewPalette => DEFAULT_PREVIEW_PALETTE;

export const getCarWindowColor = (trainId: string): string => (trainId.includes("passenger") ? "#fef3c7" : "#334155");

export const getTrainLayout = (
  train: TrainDefinition,
  previewWidth: number,
  previewPadding: number,
  maxScale: number,
  gaps = { locomotiveToTender: LOCOMOTIVE_TO_TENDER_GAP, carGap: CAR_GAP },
): TrainLayout => {
  const fullConsistLength = getTrainConsistLength(train, gaps);
  const usablePreviewWidth = previewWidth - previewPadding * 2;
  const scale = Math.min(maxScale, usablePreviewWidth / Math.max(1, fullConsistLength));
  const locomotiveStart = previewPadding;
  const tenderStart = locomotiveStart + (train.locomotive.bodyLength + gaps.locomotiveToTender) * scale;
  const rollingStockStart =
    tenderStart + (train.tender ? train.tender.length + gaps.locomotiveToTender : 0) * scale;

  return {
    fullConsistLength,
    locomotiveStart,
    tenderStart,
    rollingStockStart,
    scale,
  };
};

export const getLocomotiveSilhouette = (locomotive: LocomotiveDefinition): LocomotiveSilhouette => {
  const boilerHeight = locomotive.bodyHeight * 0.62;
  const boilerTop = -locomotive.bodyHeight + 10;
  const boilerLength = locomotive.bodyLength * 0.76;
  const runningBoardY = -locomotive.bodyHeight * 0.34;
  const cabRoofY = -(locomotive.cab?.height ?? locomotive.bodyHeight * 0.78) - 18;

  return {
    boilerTop,
    boilerHeight,
    boilerLength,
    runningBoardY,
    cabRoofY,
    smokeboxRadius: boilerHeight * 0.49,
    smokeboxCenterX: boilerLength - boilerHeight * 0.12,
  };
};

export const getRodCyclePhase = (wheelRotationRad: number): number => ((wheelRotationRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

export const countChuffPulses = (previousWheelRotation: number, nextWheelRotation: number): number => {
  const segment = Math.PI / 2;
  const previousIndex = Math.floor(previousWheelRotation / segment);
  const nextIndex = Math.floor(nextWheelRotation / segment);
  return Math.max(0, nextIndex - previousIndex);
};

const drawWheel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  palette: TrainPreviewPalette,
  spokeCount = 8,
) => {
  const wheelGradient = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.28, 1, x, y, radius);
  wheelGradient.addColorStop(0, "#dce3ee");
  wheelGradient.addColorStop(0.3, "#a4afc0");
  wheelGradient.addColorStop(1, palette.wheelFill);
  ctx.fillStyle = wheelGradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.wheelRim;
  ctx.lineWidth = Math.max(1.2, radius * 0.11);
  ctx.beginPath();
  ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = palette.wheelSpoke;
  ctx.lineWidth = Math.max(1, radius * 0.09);
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const angle = rotation + (Math.PI * 2 * spoke) / spokeCount;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (radius - 4), y + Math.sin(angle) * (radius - 4));
    ctx.stroke();
  }
};

const drawAuxWheelSet = (
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  wheelDef: AxleWheelDefinition,
  rotation: number,
  palette: TrainPreviewPalette,
) => {
  for (let index = 0; index < wheelDef.count; index += 1) {
    const x = originX + wheelDef.offsetX + index * wheelDef.spacing;
    const y = originY - 1 + (wheelDef.yOffset ?? 0);
    drawWheel(ctx, x, y, wheelDef.radius, rotation + index * 0.3, palette, 6);
  }
};

const drawCoupler = (ctx: CanvasRenderingContext2D, leftX: number, rightX: number, baseY: number) => {
  ctx.strokeStyle = "#212937";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(leftX, baseY - 8);
  ctx.lineTo((leftX + rightX) / 2, baseY - 4);
  ctx.lineTo(rightX, baseY - 8);
  ctx.stroke();
  ctx.lineCap = "butt";
};

export const drawTrackAndBallast = (
  ctx: CanvasRenderingContext2D,
  width: number,
  railY: number,
  palette: TrainPreviewPalette = DEFAULT_PREVIEW_PALETTE,
  options: TrackRenderOptions = {},
) => {
  ctx.fillStyle = palette.railBed;
  ctx.fillRect(0, railY - 4, width, 42);
  ctx.fillStyle = palette.ballastLight;
  for (let x = -18; x < width + 30; x += 12) {
    ctx.fillRect(x, railY + 18 + (x % 3), 7, 4);
  }

  const tieSpacing = 26;
  for (let x = -20; x < width + 36; x += tieSpacing) {
    ctx.fillStyle = palette.tieTop;
    ctx.fillRect(x, railY + 1, 20, 18);
    ctx.fillStyle = palette.tieShadow;
    ctx.fillRect(x + 1, railY + 13, 18, 4);
  }

  const railGradient = ctx.createLinearGradient(0, railY - 4, 0, railY + 18);
  railGradient.addColorStop(0, palette.railTop);
  railGradient.addColorStop(0.58, "#9aa6b4");
  railGradient.addColorStop(1, palette.railBottom);
  ctx.fillStyle = railGradient;
  ctx.fillRect(0, railY - 4, width, 7);
  ctx.fillRect(0, railY + 13, width, 7);

  if (options.includeSwitchStand && options.switchX !== undefined) {
    const switchX = options.switchX;
    const branchY = options.switchToSiding ? railY + 58 : railY + 2;
    ctx.strokeStyle = "#67717f";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(switchX - 6, railY + 2);
    ctx.lineTo(switchX + 90, branchY);
    ctx.stroke();

    ctx.strokeStyle = "#d0d7e2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(switchX - 6, railY + 2);
    ctx.lineTo(switchX + 90, branchY - 2);
    ctx.stroke();

    ctx.fillStyle = "#364152";
    ctx.fillRect(switchX - 8, railY - 26, 8, 22);
    ctx.fillStyle = options.switchToSiding ? "#f97316" : "#22c55e";
    ctx.beginPath();
    ctx.moveTo(switchX, railY - 23);
    ctx.lineTo(switchX + 20, railY - 18);
    ctx.lineTo(switchX, railY - 13);
    ctx.closePath();
    ctx.fill();
  }
};

const drawLocomotiveBody = (
  ctx: CanvasRenderingContext2D,
  loco: LocomotiveDefinition,
  originX: number,
  originY: number,
  wheelRotation: number,
  palette: TrainPreviewPalette,
) => {
  const silhouette = getLocomotiveSilhouette(loco);
  const pilot = loco.pilot ?? { length: 46, height: 28, color: "#38465a", ribCount: 6 };

  ctx.fillStyle = pilot.color;
  ctx.beginPath();
  ctx.moveTo(originX - pilot.length, originY);
  ctx.lineTo(originX + 8, originY + 2);
  ctx.lineTo(originX + 8, originY - pilot.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.8;
  for (let rib = 0; rib < pilot.ribCount; rib += 1) {
    const p = rib / Math.max(1, pilot.ribCount - 1);
    const ribX = originX - pilot.length + p * pilot.length;
    ctx.beginPath();
    ctx.moveTo(ribX, originY);
    ctx.lineTo(ribX + 10, originY - pilot.height + 4);
    ctx.stroke();
  }

  const boardGradient = ctx.createLinearGradient(originX, originY + 1, originX, originY - loco.bodyHeight);
  boardGradient.addColorStop(0, "#0f172a");
  boardGradient.addColorStop(0.42, palette.runningBoard);
  boardGradient.addColorStop(1, "#344255");
  ctx.fillStyle = boardGradient;
  ctx.fillRect(originX + 8, originY + silhouette.runningBoardY, silhouette.boilerLength + 62, loco.bodyHeight * 0.38);

  const boilerGradient = ctx.createLinearGradient(originX, originY + silhouette.boilerTop, originX, originY + silhouette.boilerTop + silhouette.boilerHeight);
  boilerGradient.addColorStop(0, "#e4ebf4");
  boilerGradient.addColorStop(0.16, loco.color);
  boilerGradient.addColorStop(0.55, loco.color);
  boilerGradient.addColorStop(1, "#1f2a38");
  ctx.fillStyle = boilerGradient;
  ctx.beginPath();
  ctx.roundRect(originX + 18, originY + silhouette.boilerTop, silhouette.boilerLength, silhouette.boilerHeight, 18);
  ctx.fill();

  const smokeX = originX + silhouette.smokeboxCenterX;
  const smokeY = originY + silhouette.boilerTop + silhouette.boilerHeight / 2;
  const smokeGradient = ctx.createRadialGradient(smokeX - 3, smokeY - 3, 2, smokeX, smokeY, silhouette.smokeboxRadius);
  smokeGradient.addColorStop(0, "#5f6977");
  smokeGradient.addColorStop(1, palette.smokebox);
  ctx.fillStyle = smokeGradient;
  ctx.beginPath();
  ctx.arc(smokeX, smokeY, silhouette.smokeboxRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#bcc9d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(smokeX, smokeY, silhouette.smokeboxRadius - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = loco.trimColor;
  ctx.fillRect(originX + 24, originY + silhouette.boilerTop - 10, silhouette.boilerLength * 0.62, 6);

  const stack = loco.stack ?? { width: 20, height: 36, flareWidth: 32, flareHeight: 10, offsetX: 68, offsetY: -102 };
  const stackX = originX + stack.offsetX;
  const stackY = originY + stack.offsetY;
  const stackGradient = ctx.createLinearGradient(stackX, stackY, stackX, stackY + stack.height + stack.flareHeight);
  stackGradient.addColorStop(0, "#0a0f1b");
  stackGradient.addColorStop(1, "#485566");
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
  ctx.fillStyle = "#d7edff";
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
  ctx.ellipse(lampX - 22, lampY, lamp.radius * 2.8, lamp.radius * 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lamp.rimColor;
  ctx.beginPath();
  ctx.arc(lampX, lampY, lamp.radius + 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff3b0";
  ctx.beginPath();
  ctx.arc(lampX, lampY, lamp.radius * 0.56, 0, Math.PI * 2);
  ctx.fill();

  if (loco.pilotWheels) {
    drawAuxWheelSet(ctx, originX, originY, loco.pilotWheels, wheelRotation * 0.82, palette);
  }

  const wheelSet = loco.wheelSet;
  const wheelCenters = Array.from({ length: wheelSet.count }).map((_, index) => {
    const x = originX + wheelSet.offsetX + index * wheelSet.spacing;
    const y = originY - 1;
    drawWheel(ctx, x, y, wheelSet.radius, wheelRotation + index * 0.18, palette, 9);
    return { x, y };
  });

  if (loco.trailingWheels) {
    drawAuxWheelSet(ctx, originX, originY, loco.trailingWheels, wheelRotation * 0.74, palette);
  }

  const rod = loco.drivingRod;
  const phase = getRodCyclePhase(wheelRotation);
  const crankWheel = wheelCenters[Math.min(wheelCenters.length - 1, Math.max(0, rod.wheelIndex))];
  const leadWheel = wheelCenters[0];
  const trailingWheel = wheelCenters[wheelCenters.length - 1];

  const leftCrankX = crankWheel.x + Math.cos(phase) * rod.crankRadius;
  const leftCrankY = crankWheel.y + Math.sin(phase) * rod.crankRadius;
  const rightCrankX = leadWheel.x + Math.cos(phase + 0.18) * (rod.crankRadius * 0.92);
  const rightCrankY = leadWheel.y + Math.sin(phase + 0.18) * (rod.crankRadius * 0.92);

  const pistonX = leadWheel.x - rod.rodLength * 0.45;
  const pistonY = crankWheel.y + rod.anchorOffsetY;
  ctx.fillStyle = "#46576d";
  ctx.fillRect(pistonX - 24, pistonY - 8, 24, 16);

  ctx.strokeStyle = palette.brass;
  ctx.lineWidth = rod.thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pistonX, pistonY);
  ctx.lineTo(leftCrankX, leftCrankY);
  ctx.lineTo(trailingWheel.x + 10, trailingWheel.y - 2);
  ctx.stroke();

  ctx.strokeStyle = "#c68e2e";
  ctx.lineWidth = Math.max(3, rod.thickness - 2);
  ctx.beginPath();
  ctx.moveTo(rightCrankX, rightCrankY);
  ctx.lineTo(leftCrankX, leftCrankY);
  ctx.lineTo(leadWheel.x + 10, leadWheel.y - 2);
  ctx.stroke();

  ctx.fillStyle = "#ffd26a";
  [
    [leftCrankX, leftCrankY],
    [rightCrankX, rightCrankY],
    [pistonX, pistonY],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  return originX + loco.bodyLength + 6;
};

const drawTender = (
  ctx: CanvasRenderingContext2D,
  train: TrainDefinition,
  x: number,
  baseY: number,
  palette: TrainPreviewPalette,
) => {
  const tender = train.tender;
  if (!tender) {
    return x;
  }

  const y = baseY - tender.height;
  const tenderGradient = ctx.createLinearGradient(x, y, x, baseY);
  tenderGradient.addColorStop(0, tender.color);
  tenderGradient.addColorStop(1, "#111827");
  ctx.fillStyle = tenderGradient;
  ctx.fillRect(x, y, tender.length, tender.height);

  ctx.fillStyle = "#111827";
  ctx.fillRect(x + 8, y - 14, tender.length - 16, 14);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x + 16, y + 10, tender.length - 32, 8);

  [36, tender.length - 44].forEach((offset) => {
    drawWheel(ctx, x + offset, baseY - 2, 18, 0, palette, 8);
  });

  return x + tender.length;
};

const drawCar = (
  ctx: CanvasRenderingContext2D,
  train: TrainDefinition,
  carIndex: number,
  x: number,
  baseY: number,
  palette: TrainPreviewPalette,
) => {
  const car = train.rollingStock[carIndex];
  if (!car) {
    return x;
  }
  const y = baseY - car.height;
  const carGradient = ctx.createLinearGradient(x, y, x, baseY);
  carGradient.addColorStop(0, car.color);
  carGradient.addColorStop(1, "#1f2937");
  ctx.fillStyle = carGradient;
  ctx.fillRect(x, y, car.length, car.height);

  if (train.id.includes("passenger")) {
    ctx.fillStyle = "#ffefb1";
    const windowCount = Math.max(4, Math.floor(car.length / 28));
    for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
      const wx = x + 10 + windowIndex * ((car.length - 20) / windowCount);
      ctx.fillRect(wx, y + 10, 11, 11);
    }
  } else {
    ctx.fillStyle = "#334155";
    ctx.fillRect(x + 10, y + 10, car.length - 20, Math.min(20, car.height * 0.46));
    for (let rib = 0; rib < 4; rib += 1) {
      ctx.fillStyle = "rgba(226,232,240,0.22)";
      ctx.fillRect(x + 14 + rib * ((car.length - 36) / 4), y + 10, 4, car.height - 18);
    }
  }

  drawWheel(ctx, x + 24, baseY - 2, 14, 0, palette, 6);
  drawWheel(ctx, x + car.length - 26, baseY - 2, 14, 0, palette, 6);

  return x + car.length;
};

export const drawTrainConsist = (ctx: CanvasRenderingContext2D, train: TrainDefinition, options: TrainArtRenderOptions) => {
  const scale = options.scale ?? 1;
  const palette = options.palette ?? DEFAULT_PREVIEW_PALETTE;
  const wheelRotation = options.wheelRotationRad ?? 0;
  const railTopY = options.railTopY ?? options.baseY;

  ctx.save();
  ctx.translate(options.baseX, options.baseY);
  ctx.scale(scale, scale);

  const locoCouplerX = drawLocomotiveBody(ctx, train.locomotive, 0, 0, wheelRotation, palette);
  let rollingX = train.locomotive.bodyLength + LOCOMOTIVE_TO_TENDER_GAP;
  let previousCouplerX = locoCouplerX;

  if (train.tender) {
    drawCoupler(ctx, previousCouplerX, rollingX + 2, railTopY - options.baseY);
    const tenderEndX = drawTender(ctx, train, rollingX, 0, palette);
    previousCouplerX = tenderEndX - 2;
    rollingX = tenderEndX + LOCOMOTIVE_TO_TENDER_GAP;
  }

  train.rollingStock.forEach((_, index) => {
    drawCoupler(ctx, previousCouplerX, rollingX + 2, railTopY - options.baseY);
    const carEnd = drawCar(ctx, train, index, rollingX, 0, palette);
    previousCouplerX = carEnd - 2;
    rollingX = carEnd + CAR_GAP + 6;
  });

  if (train.rollingStock.length > 0) {
    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(previousCouplerX + 4, -18, 5, 10);
  }

  ctx.restore();
};

export const drawSteamParticleRich = (ctx: CanvasRenderingContext2D, particle: SteamParticle, cameraX: number) => {
  const px = particle.x - cameraX;
  const baseAlpha = Math.max(0.04, particle.alpha);

  const body = ctx.createRadialGradient(px - particle.radius * 0.3, particle.y - particle.radius * 0.3, 1, px, particle.y, particle.radius * 1.4);
  body.addColorStop(0, `rgba(255,255,255,${baseAlpha})`);
  body.addColorStop(0.35, `rgba(240,246,255,${baseAlpha * 0.82})`);
  body.addColorStop(0.75, `rgba(190,198,210,${baseAlpha * 0.35})`);
  body.addColorStop(1, `rgba(105,113,126,${baseAlpha * 0.05})`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(px, particle.y, particle.radius * 1.16, 0, Math.PI * 2);
  ctx.fill();
};

export const drawPreviewBackdrop = (ctx: CanvasRenderingContext2D, width: number, height: number, palette: TrainPreviewPalette = DEFAULT_PREVIEW_PALETTE) => {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.76);
  skyGradient.addColorStop(0, palette.skyTop);
  skyGradient.addColorStop(0.68, palette.skyHorizon);
  skyGradient.addColorStop(1, "#f7fbff");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.76);

  const groundGradient = ctx.createLinearGradient(0, height * 0.72, 0, height);
  groundGradient.addColorStop(0, palette.groundTop);
  groundGradient.addColorStop(1, palette.groundBottom);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
};

export const renderTrainPreviewCard = (
  ctx: CanvasRenderingContext2D,
  train: TrainDefinition,
  width: number,
  height: number,
  wheelRotationRad = 0,
) => {
  const palette = getPreviewPalette();
  const previewPadding = 8;
  const layout = getTrainLayout(train, width, previewPadding, 0.64);
  const baseY = Math.round(height * 0.82);

  ctx.clearRect(0, 0, width, height);
  drawPreviewBackdrop(ctx, width, height, palette);
  drawTrackAndBallast(ctx, width, baseY - 2, palette);

  drawTrainConsist(ctx, train, {
    baseX: layout.locomotiveStart,
    baseY,
    scale: layout.scale,
    wheelRotationRad,
    palette,
  });

  const smokeX = layout.locomotiveStart + (train.locomotive.stack?.offsetX ?? 68) * layout.scale;
  const smokeY = baseY + ((train.locomotive.stack?.offsetY ?? -102) - 8) * layout.scale;
  for (let i = 0; i < 5; i += 1) {
    const r = 12 * layout.scale + i * 7 * layout.scale;
    const drift = i * 18 * layout.scale;
    ctx.fillStyle = `rgba(234,240,248,${0.28 - i * 0.04})`;
    ctx.beginPath();
    ctx.ellipse(smokeX + drift, smokeY - i * 12 * layout.scale, r * 1.14, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};
