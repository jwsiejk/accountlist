import {
  DEFAULT_TRAIN_ART_PALETTE,
  drawBackdropAsset,
  drawCompositedTrainAsset,
  drawSceneAsset,
  drawSteamAsset,
  drawTrackAsset,
  type TrainArtPalette,
} from "./art/assetSystem";
import type { LocomotiveDefinition, SteamParticle, TrainDefinition } from "./types";

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

export type TrainPreviewPalette = TrainArtPalette;

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
};

export const getPreviewPalette = (): TrainPreviewPalette => DEFAULT_TRAIN_ART_PALETTE;

export const getCarWindowColor = (trainId: string): string => (trainId.includes("passenger") ? "#ffefb5" : "#334155");

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
  const rollingStockStart = tenderStart + (train.tender ? train.tender.length + gaps.locomotiveToTender : 0) * scale;

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

export const drawTrackTurnout = (
  ctx: CanvasRenderingContext2D,
  railY: number,
  options: Pick<TrackRenderOptions, "switchX" | "switchToSiding">,
) => {
  if (options.switchX === undefined) {
    return;
  }

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

  ctx.fillStyle = "#374151";
  ctx.fillRect(switchX - 8, railY - 25, 9, 21);
  ctx.fillStyle = options.switchToSiding ? "#f97316" : "#22c55e";
  ctx.beginPath();
  ctx.moveTo(switchX + 1, railY - 23);
  ctx.lineTo(switchX + 20, railY - 17);
  ctx.lineTo(switchX + 1, railY - 12);
  ctx.closePath();
  ctx.fill();
};

export const drawTrackAndBallast = (
  ctx: CanvasRenderingContext2D,
  width: number,
  railY: number,
  palette: TrainPreviewPalette = DEFAULT_TRAIN_ART_PALETTE,
  options: TrackRenderOptions = {},
) => {
  const switches = options.includeSwitchStand && options.switchX !== undefined ? [{ x: options.switchX, siding: Boolean(options.switchToSiding) }] : [];
  drawTrackAsset(ctx, width, railY, palette, switches);
};

export const drawTrainConsist = (ctx: CanvasRenderingContext2D, train: TrainDefinition, options: TrainArtRenderOptions) => {
  const scale = options.scale ?? 1;
  const wheelRotation = options.wheelRotationRad ?? 0;

  ctx.save();
  ctx.translate(options.baseX, options.baseY);
  ctx.scale(scale, scale);
  drawCompositedTrainAsset(ctx, train, 0, 0, wheelRotation, {
    locomotiveToTender: LOCOMOTIVE_TO_TENDER_GAP,
    carGap: CAR_GAP,
  });
  ctx.restore();
};

export const drawSteamParticleRich = (ctx: CanvasRenderingContext2D, particle: SteamParticle, cameraX: number) => {
  drawSteamAsset(ctx, particle, cameraX);
};

export const drawPreviewBackdrop = (ctx: CanvasRenderingContext2D, width: number, height: number, palette: TrainPreviewPalette = DEFAULT_TRAIN_ART_PALETTE) => {
  drawBackdropAsset(ctx, width, height, palette);
};

export const drawLevelSceneDecor = (ctx: CanvasRenderingContext2D, scene: "yard" | "station" | "bridge" | "tunnel", width: number, railY: number, palette: TrainPreviewPalette = DEFAULT_TRAIN_ART_PALETTE) => {
  drawSceneAsset(ctx, scene, width, railY, palette);
};

export const renderTrainPreviewCard = (
  ctx: CanvasRenderingContext2D,
  train: TrainDefinition,
  width: number,
  height: number,
  wheelRotationRad = 0,
) => {
  const palette = getPreviewPalette();
  const layout = getTrainLayout(train, width, 8, 0.68);
  drawPreviewBackdrop(ctx, width, height, palette);

  const railY = Math.round(height * 0.76);
  drawTrackAndBallast(ctx, width, railY, palette);
  drawTrainConsist(ctx, train, {
    baseX: layout.locomotiveStart,
    baseY: railY + 2,
    wheelRotationRad,
    scale: layout.scale,
    palette,
  });
};
