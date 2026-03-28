import type { LevelScene, LocomotiveDefinition, RollingStockDefinition, SteamParticle, TenderDefinition, TrainDefinition } from "../types";

export type MaterialPalette = {
  paintedMetalTop: string;
  paintedMetalBottom: string;
  soot: string;
  sootDeep: string;
  brass: string;
  brassDark: string;
  steel: string;
  steelDark: string;
  glass: string;
  cabShade: string;
};

export type TrainArtPalette = {
  skyTop: string;
  skyHorizon: string;
  skyGlow: string;
  groundTop: string;
  groundBottom: string;
  mountain: string;
  railBedTop: string;
  railBedBottom: string;
  ballastLight: string;
  ballastDark: string;
  sleeperTop: string;
  sleeperShadow: string;
  railTop: string;
  railSide: string;
  sceneWood: string;
  sceneBrick: string;
  foliageDark: string;
  foliageLight: string;
};

export const DEFAULT_TRAIN_ART_PALETTE: TrainArtPalette = {
  skyTop: "#81c4f8",
  skyHorizon: "#f4fbff",
  skyGlow: "#d8ecff",
  groundTop: "#7ca259",
  groundBottom: "#4f6733",
  mountain: "#64858f",
  railBedTop: "#8f6b4e",
  railBedBottom: "#64462f",
  ballastLight: "#b39070",
  ballastDark: "#6e533e",
  sleeperTop: "#6a4b34",
  sleeperShadow: "#3e2a1d",
  railTop: "#e8edf5",
  railSide: "#7d8896",
  sceneWood: "#6b4f36",
  sceneBrick: "#8d5a4d",
  foliageDark: "#35513a",
  foliageLight: "#52734e",
};

const pickFamily = (loco: LocomotiveDefinition): "switcher" | "passenger" | "freight" => {
  if (loco.wheelSet.count <= 2) return "switcher";
  if (loco.wheelSet.count >= 4) return "freight";
  return "passenger";
};

export const getMaterialPalette = (loco: LocomotiveDefinition): MaterialPalette => ({
  paintedMetalTop: loco.color,
  paintedMetalBottom: "#0b1220",
  soot: "#272f3d",
  sootDeep: "#0b0f16",
  brass: loco.trimColor,
  brassDark: "#8f6421",
  steel: "#b9c7d7",
  steelDark: "#6b7582",
  glass: "#d8efff",
  cabShade: "#1f2a38",
});

const drawWheelAsset = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number, trimColor: string) => {
  const plate = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.34, 1, x, y, radius);
  plate.addColorStop(0, "#f3f7fb");
  plate.addColorStop(0.4, "#a9b6c7");
  plate.addColorStop(1, "#101722");
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d4deea";
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
  ctx.stroke();

  const spokeCount = Math.max(6, Math.round(radius / 4));
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = Math.max(1.5, radius * 0.08);
  for (let i = 0; i < spokeCount; i += 1) {
    const a = rotation + (Math.PI * 2 * i) / spokeCount;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (radius - 5), y + Math.sin(a) * (radius - 5));
    ctx.stroke();
  }

  ctx.fillStyle = trimColor;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(4, radius * 0.18), 0, Math.PI * 2);
  ctx.fill();
};

const drawRunningGear = (ctx: CanvasRenderingContext2D, loco: LocomotiveDefinition, baseX: number, baseY: number, wheelRotation: number, trimColor: string) => {
  const centers = Array.from({ length: loco.wheelSet.count }).map((_, idx) => {
    const x = baseX + loco.wheelSet.offsetX + idx * loco.wheelSet.spacing;
    const y = baseY;
    drawWheelAsset(ctx, x, y, loco.wheelSet.radius, wheelRotation + idx * 0.14, trimColor);
    return { x, y };
  });

  const drawTruck = (count: number, radius: number, offsetX: number, spacing: number, yOffset: number, phase: number) => {
    for (let i = 0; i < count; i += 1) {
      drawWheelAsset(ctx, baseX + offsetX + i * spacing, baseY + yOffset, radius, wheelRotation * phase + i * 0.3, "#c9d2df");
    }
  };

  if (loco.pilotWheels) {
    drawTruck(loco.pilotWheels.count, loco.pilotWheels.radius, loco.pilotWheels.offsetX, loco.pilotWheels.spacing, loco.pilotWheels.yOffset ?? -2, 0.85);
  }
  if (loco.trailingWheels) {
    drawTruck(loco.trailingWheels.count, loco.trailingWheels.radius, loco.trailingWheels.offsetX, loco.trailingWheels.spacing, loco.trailingWheels.yOffset ?? -2, 0.75);
  }

  const rod = loco.drivingRod;
  const first = centers[0];
  const crank = centers[Math.min(centers.length - 1, rod.wheelIndex)];
  const tail = centers[centers.length - 1];
  const phase = wheelRotation % (Math.PI * 2);

  const crankX = crank.x + Math.cos(phase) * rod.crankRadius;
  const crankY = crank.y + Math.sin(phase) * rod.crankRadius;
  const leadX = first.x + Math.cos(phase + 0.18) * rod.crankRadius * 0.85;
  const leadY = first.y + Math.sin(phase + 0.18) * rod.crankRadius * 0.85;
  const pistonX = first.x - rod.rodLength * 0.44;
  const pistonY = crank.y + rod.anchorOffsetY;

  ctx.fillStyle = "#4b5f79";
  ctx.fillRect(pistonX - 24, pistonY - 8, 24, 16);

  ctx.strokeStyle = "#c7953a";
  ctx.lineWidth = rod.thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pistonX, pistonY);
  ctx.lineTo(crankX, crankY);
  ctx.lineTo(tail.x + 12, tail.y - 2);
  ctx.stroke();

  ctx.strokeStyle = "#b67f26";
  ctx.lineWidth = Math.max(3, rod.thickness - 2);
  ctx.beginPath();
  ctx.moveTo(leadX, leadY);
  ctx.lineTo(crankX, crankY);
  ctx.lineTo(first.x + 12, first.y - 2);
  ctx.stroke();

  [
    [crankX, crankY],
    [leadX, leadY],
    [pistonX, pistonY],
  ].forEach(([x, y]) => {
    ctx.fillStyle = "#f3c45c";
    ctx.beginPath();
    ctx.arc(x, y, 4.4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.lineCap = "butt";
};

export const drawLocomotiveAsset = (ctx: CanvasRenderingContext2D, loco: LocomotiveDefinition, x: number, baseY: number, wheelRotation: number) => {
  const family = pickFamily(loco);
  const materials = getMaterialPalette(loco);
  const boilerHeight = loco.bodyHeight * (family === "freight" ? 0.66 : 0.61);
  const boilerY = baseY - loco.bodyHeight + 12;
  const boilerLength = loco.bodyLength * (family === "switcher" ? 0.71 : 0.76);
  const smokeCenterX = x + boilerLength - boilerHeight * 0.05;
  const smokeCenterY = boilerY + boilerHeight / 2;

  const pilot = loco.pilot ?? { length: 42, height: 24, color: "#374151", ribCount: 5 };
  ctx.fillStyle = pilot.color;
  ctx.beginPath();
  ctx.moveTo(x - pilot.length, baseY + 1);
  ctx.lineTo(x + 10, baseY + 2);
  ctx.lineTo(x + 10, baseY - pilot.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.6;
  for (let r = 0; r < pilot.ribCount; r += 1) {
    const t = r / Math.max(1, pilot.ribCount - 1);
    const rx = x - pilot.length + t * pilot.length;
    ctx.beginPath();
    ctx.moveTo(rx, baseY);
    ctx.lineTo(rx + 11, baseY - pilot.height + 4);
    ctx.stroke();
  }

  const boardGrad = ctx.createLinearGradient(x, baseY + 2, x, baseY - loco.bodyHeight * 0.5);
  boardGrad.addColorStop(0, materials.sootDeep);
  boardGrad.addColorStop(1, "#364457");
  ctx.fillStyle = boardGrad;
  ctx.fillRect(x + 10, baseY - loco.bodyHeight * 0.35, boilerLength + 70, loco.bodyHeight * 0.4);

  const boilerGrad = ctx.createLinearGradient(x, boilerY, x, boilerY + boilerHeight);
  boilerGrad.addColorStop(0, "#dfe8f2");
  boilerGrad.addColorStop(0.2, materials.paintedMetalTop);
  boilerGrad.addColorStop(1, materials.paintedMetalBottom);
  ctx.fillStyle = boilerGrad;
  ctx.beginPath();
  ctx.roundRect(x + 20, boilerY, boilerLength, boilerHeight, 20);
  ctx.fill();

  const smokeDoorGrad = ctx.createRadialGradient(smokeCenterX - 4, smokeCenterY - 4, 2, smokeCenterX, smokeCenterY, boilerHeight * 0.5);
  smokeDoorGrad.addColorStop(0, "#6b7280");
  smokeDoorGrad.addColorStop(1, materials.soot);
  ctx.fillStyle = smokeDoorGrad;
  ctx.beginPath();
  ctx.arc(smokeCenterX, smokeCenterY, boilerHeight * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#c4ceda";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(smokeCenterX, smokeCenterY, boilerHeight * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  const stack = loco.stack ?? { width: 20, height: 36, flareWidth: 32, flareHeight: 10, offsetX: 74, offsetY: -104 };
  const sx = x + stack.offsetX;
  const sy = baseY + stack.offsetY;
  const stackGrad = ctx.createLinearGradient(sx, sy, sx, sy + stack.height + stack.flareHeight);
  stackGrad.addColorStop(0, materials.sootDeep);
  stackGrad.addColorStop(1, "#525f72");
  ctx.fillStyle = stackGrad;
  ctx.beginPath();
  ctx.roundRect(sx, sy, stack.width, stack.height, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(sx - (stack.flareWidth - stack.width) / 2, sy - stack.flareHeight, stack.flareWidth, stack.flareHeight + 2, 5);
  ctx.fill();

  const cab = loco.cab ?? { width: 82, height: 62, roofOverhang: 14, roofHeight: 10, offsetX: loco.bodyLength - 92, windowWidth: 18, windowHeight: 15 };
  const cabX = x + cab.offsetX;
  const cabY = baseY - cab.height - 12;
  ctx.fillStyle = loco.color;
  ctx.beginPath();
  ctx.moveTo(cabX, cabY + cab.height);
  ctx.lineTo(cabX + cab.width, cabY + cab.height);
  ctx.lineTo(cabX + cab.width, cabY + 12);
  ctx.lineTo(cabX + cab.width - 18, cabY);
  ctx.lineTo(cabX + 14, cabY);
  ctx.lineTo(cabX, cabY + 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = materials.sootDeep;
  ctx.fillRect(cabX - cab.roofOverhang, cabY - cab.roofHeight, cab.width + cab.roofOverhang * 2, cab.roofHeight);
  ctx.fillStyle = materials.glass;
  ctx.fillRect(cabX + 12, cabY + 13, cab.windowWidth, cab.windowHeight);
  ctx.fillRect(cabX + 40, cabY + 13, cab.windowWidth, cab.windowHeight);

  ctx.fillStyle = loco.trimColor;
  ctx.fillRect(x + 24, boilerY - 8, boilerLength * 0.64, 6);

  const lamp = loco.headlamp ?? { radius: 10, offsetX: 10, offsetY: -56, rimColor: "#f59e0b", glowColor: "rgba(255,244,184,0.6)" };
  const lx = x + lamp.offsetX;
  const ly = baseY + lamp.offsetY;
  ctx.fillStyle = lamp.glowColor;
  ctx.beginPath();
  ctx.ellipse(lx - 24, ly, lamp.radius * 2.9, lamp.radius * 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lamp.rimColor;
  ctx.beginPath();
  ctx.arc(lx, ly, lamp.radius + 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff2b3";
  ctx.beginPath();
  ctx.arc(lx, ly, lamp.radius * 0.56, 0, Math.PI * 2);
  ctx.fill();

  drawRunningGear(ctx, loco, x, baseY - 1, wheelRotation, loco.trimColor);
  return x + loco.bodyLength + 8;
};

const drawCoupler = (ctx: CanvasRenderingContext2D, leftX: number, rightX: number, y: number) => {
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(leftX, y - 9);
  ctx.lineTo((leftX + rightX) / 2, y - 6);
  ctx.lineTo(rightX, y - 9);
  ctx.stroke();
  ctx.lineCap = "butt";
};

export const drawTenderAsset = (ctx: CanvasRenderingContext2D, tender: TenderDefinition, x: number, baseY: number, wheelRotation: number) => {
  const y = baseY - tender.height;
  const shell = ctx.createLinearGradient(x, y, x, baseY);
  shell.addColorStop(0, tender.color);
  shell.addColorStop(1, "#0b1220");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.roundRect(x, y, tender.length, tender.height, 8);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.fillRect(x + 8, y - 14, tender.length - 16, 14);
  ctx.fillStyle = "#374151";
  ctx.fillRect(x + 14, y + 10, tender.length - 28, 9);

  drawWheelAsset(ctx, x + 36, baseY - 2, 18, wheelRotation, "#d5ddea");
  drawWheelAsset(ctx, x + tender.length - 44, baseY - 2, 18, wheelRotation + 0.2, "#d5ddea");
  return x + tender.length;
};

export const drawCarAsset = (ctx: CanvasRenderingContext2D, train: TrainDefinition, car: RollingStockDefinition, x: number, baseY: number, wheelRotation: number) => {
  const y = baseY - car.height;
  const shell = ctx.createLinearGradient(x, y, x, baseY);
  shell.addColorStop(0, car.color);
  shell.addColorStop(1, "#1b2434");
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.roundRect(x, y, car.length, car.height, 7);
  ctx.fill();

  if (train.id.includes("passenger")) {
    const count = Math.max(4, Math.floor(car.length / 28));
    ctx.fillStyle = "#ffefb5";
    for (let i = 0; i < count; i += 1) {
      const wx = x + 10 + i * ((car.length - 24) / count);
      ctx.fillRect(wx, y + 10, 11, 12);
    }
    ctx.fillStyle = "#d9b86b";
    ctx.fillRect(x + 8, y + 7, car.length - 16, 3);
  } else {
    ctx.fillStyle = "#3b475c";
    ctx.fillRect(x + 10, y + 11, car.length - 20, Math.min(22, car.height * 0.5));
    for (let rib = 0; rib < 5; rib += 1) {
      ctx.fillStyle = "rgba(226,232,240,0.2)";
      ctx.fillRect(x + 14 + rib * ((car.length - 36) / 5), y + 9, 4, car.height - 14);
    }
  }

  drawWheelAsset(ctx, x + 24, baseY - 2, 14, wheelRotation, "#cad4e1");
  drawWheelAsset(ctx, x + car.length - 26, baseY - 2, 14, wheelRotation + 0.2, "#cad4e1");
  return x + car.length;
};

export const drawCompositedTrainAsset = (
  ctx: CanvasRenderingContext2D,
  train: TrainDefinition,
  baseX: number,
  baseY: number,
  wheelRotation: number,
  gaps: { locomotiveToTender: number; carGap: number },
) => {
  const locoTail = drawLocomotiveAsset(ctx, train.locomotive, baseX, baseY, wheelRotation);
  let cursor = baseX + train.locomotive.bodyLength + gaps.locomotiveToTender;
  let previousCoupler = locoTail;

  if (train.tender) {
    drawCoupler(ctx, previousCoupler, cursor + 2, baseY);
    const end = drawTenderAsset(ctx, train.tender, cursor, baseY, wheelRotation);
    previousCoupler = end - 2;
    cursor = end + gaps.locomotiveToTender;
  }

  train.rollingStock.forEach((car) => {
    drawCoupler(ctx, previousCoupler, cursor + 2, baseY);
    const end = drawCarAsset(ctx, train, car, cursor, baseY, wheelRotation);
    previousCoupler = end - 2;
    cursor = end + gaps.carGap + 6;
  });
};

export const drawTrackAsset = (
  ctx: CanvasRenderingContext2D,
  width: number,
  railY: number,
  palette: TrainArtPalette,
  switches: Array<{ x: number; siding: boolean }> = [],
) => {
  const railBed = ctx.createLinearGradient(0, railY - 4, 0, railY + 50);
  railBed.addColorStop(0, palette.railBedTop);
  railBed.addColorStop(1, palette.railBedBottom);
  ctx.fillStyle = railBed;
  ctx.fillRect(0, railY - 5, width, 44);

  for (let x = -14; x < width + 20; x += 10) {
    ctx.fillStyle = x % 3 === 0 ? palette.ballastDark : palette.ballastLight;
    ctx.fillRect(x, railY + 18 + (x % 5), 6, 4);
  }

  for (let x = -20; x < width + 40; x += 26) {
    ctx.fillStyle = palette.sleeperTop;
    ctx.fillRect(x, railY + 1, 20, 18);
    ctx.fillStyle = palette.sleeperShadow;
    ctx.fillRect(x + 1, railY + 13, 18, 4);
  }

  const railGrad = ctx.createLinearGradient(0, railY - 4, 0, railY + 18);
  railGrad.addColorStop(0, palette.railTop);
  railGrad.addColorStop(1, palette.railSide);
  ctx.fillStyle = railGrad;
  ctx.fillRect(0, railY - 4, width, 7);
  ctx.fillRect(0, railY + 13, width, 7);

  switches.forEach((sw) => {
    const branchY = sw.siding ? railY + 58 : railY + 2;
    ctx.strokeStyle = "#67717f";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(sw.x - 6, railY + 2);
    ctx.lineTo(sw.x + 90, branchY);
    ctx.stroke();

    ctx.strokeStyle = "#d0d7e2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sw.x - 6, railY + 2);
    ctx.lineTo(sw.x + 90, branchY - 2);
    ctx.stroke();

    ctx.fillStyle = "#374151";
    ctx.fillRect(sw.x - 8, railY - 25, 9, 21);
    ctx.fillStyle = sw.siding ? "#f97316" : "#22c55e";
    ctx.beginPath();
    ctx.moveTo(sw.x + 1, railY - 23);
    ctx.lineTo(sw.x + 20, railY - 17);
    ctx.lineTo(sw.x + 1, railY - 12);
    ctx.closePath();
    ctx.fill();
  });
};

export const drawBackdropAsset = (ctx: CanvasRenderingContext2D, width: number, height: number, palette: TrainArtPalette) => {
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.78);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.62, palette.skyHorizon);
  sky.addColorStop(1, palette.skyGlow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height * 0.8);

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, height * 0.62, width, 36);

  const ground = ctx.createLinearGradient(0, height * 0.72, 0, height);
  ground.addColorStop(0, palette.groundTop);
  ground.addColorStop(1, palette.groundBottom);
  ctx.fillStyle = ground;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
};

export const drawSceneAsset = (ctx: CanvasRenderingContext2D, scene: LevelScene, width: number, railY: number, _palette: TrainArtPalette) => {
  const ridgeY = railY - 126;
  ctx.fillStyle = "rgba(50,85,66,0.38)";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 180, ridgeY + 64);
    ctx.quadraticCurveTo(i * 180 + 84, ridgeY + 12, i * 180 + 162, ridgeY + 64);
    ctx.lineTo(i * 180 + 162, railY + 150);
    ctx.lineTo(i * 180, railY + 150);
    ctx.closePath();
    ctx.fill();
  }

  if (scene === "yard") {
    ctx.fillStyle = "#728194";
    ctx.fillRect(width * 0.05, railY - 142, 230, 96);
    ctx.fillStyle = "#586779";
    ctx.fillRect(width * 0.04, railY - 158, 248, 16);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = "#465569";
      ctx.fillRect(width * 0.07 + i * 44, railY - 120, 26, 40);
    }
    ctx.fillStyle = "#6b4f36";
    ctx.fillRect(width * 0.36, railY - 44, 184, 9);
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(width * 0.37 + i * 48, railY - 73, 9, 29);
    }
  }

  if (scene === "station") {
    ctx.fillStyle = "#f5f7fb";
    ctx.fillRect(width * 0.49, railY - 164, 338, 112);
    ctx.fillStyle = "#8d5a4d";
    ctx.fillRect(width * 0.47, railY - 182, 380, 22);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = "#344456";
      ctx.fillRect(width * 0.52 + i * 52, railY - 142, 24, 42);
    }
    ctx.fillStyle = "#cfe3ff";
    ctx.fillRect(width * 0.53, railY - 98, 312, 24);
    ctx.fillStyle = "#8796ab";
    ctx.fillRect(width * 0.44, railY - 6, 420, 10);
  }

  if (scene === "bridge") {
    ctx.fillStyle = "#314255";
    ctx.fillRect(width * 0.06, railY + 8, width * 0.88, 26);
    ctx.fillStyle = "#43566b";
    for (let i = 0; i < 10; i += 1) {
      const x = width * 0.1 + i * (width * 0.078);
      ctx.fillRect(x, railY + 34, 12, 76);
      ctx.beginPath();
      ctx.moveTo(x + 6, railY + 34);
      ctx.lineTo(x + 52, railY + 110);
      ctx.lineTo(x + 44, railY + 110);
      ctx.lineTo(x, railY + 40);
      ctx.closePath();
      ctx.fill();
    }
    const water = ctx.createLinearGradient(0, railY + 110, 0, railY + 240);
    water.addColorStop(0, "#4f9de8");
    water.addColorStop(1, "#1d4e89");
    ctx.fillStyle = water;
    ctx.fillRect(0, railY + 110, width, 130);
  }

  if (scene === "tunnel") {
    ctx.fillStyle = "#556173";
    ctx.beginPath();
    ctx.arc(width * 0.73, railY - 22, 150, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.73 - 150, railY - 22, 300, 128);

    ctx.fillStyle = "#0f1723";
    ctx.beginPath();
    ctx.arc(width * 0.73, railY - 22, 112, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.73 - 112, railY - 22, 224, 108);
  }
};

export const drawSteamAsset = (ctx: CanvasRenderingContext2D, particle: SteamParticle, cameraX: number) => {
  const x = particle.x - cameraX;
  const alpha = Math.max(0.03, particle.alpha);
  const plume = ctx.createRadialGradient(x - particle.radius * 0.38, particle.y - particle.radius * 0.36, 1, x, particle.y, particle.radius * 1.45);
  plume.addColorStop(0, `rgba(255,255,255,${alpha})`);
  plume.addColorStop(0.35, `rgba(241,246,255,${alpha * 0.86})`);
  plume.addColorStop(0.7, `rgba(194,202,214,${alpha * 0.38})`);
  plume.addColorStop(1, `rgba(96,106,120,${alpha * 0.08})`);
  ctx.fillStyle = plume;
  ctx.beginPath();
  ctx.arc(x, particle.y, particle.radius * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.45})`;
  ctx.beginPath();
  ctx.arc(x - particle.radius * 0.22, particle.y - particle.radius * 0.25, particle.radius * 0.46, 0, Math.PI * 2);
  ctx.fill();
};
