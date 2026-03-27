import type { LocomotiveDefinition, TrainDefinition } from "./types";

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
  railBed: string;
  railTop: string;
  railBottom: string;
  wheelFill: string;
  wheelRim: string;
  wheelSpoke: string;
  runningBoard: string;
  stack: string;
  smokebox: string;
};

const DEFAULT_PREVIEW_PALETTE: TrainPreviewPalette = {
  railBed: "#7c6450",
  railTop: "#d1d5db",
  railBottom: "#9ca3af",
  wheelFill: "#0f172a",
  wheelRim: "#cbd5e1",
  wheelSpoke: "#94a3b8",
  runningBoard: "#0f172a",
  stack: "#0f172a",
  smokebox: "#111827",
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
  const boilerHeight = locomotive.bodyHeight * 0.58;
  const boilerTop = -locomotive.bodyHeight + 14;
  const boilerLength = locomotive.bodyLength * 0.74;
  const runningBoardY = -locomotive.bodyHeight * 0.34;
  const cabRoofY = -(locomotive.cab?.height ?? locomotive.bodyHeight * 0.75) - 16;

  return {
    boilerTop,
    boilerHeight,
    boilerLength,
    runningBoardY,
    cabRoofY,
    smokeboxRadius: boilerHeight * 0.48,
    smokeboxCenterX: boilerLength - boilerHeight * 0.18,
  };
};

export const getRodCyclePhase = (wheelRotationRad: number): number => ((wheelRotationRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

export const countChuffPulses = (previousWheelRotation: number, nextWheelRotation: number): number => {
  const segment = Math.PI / 2;
  const previousIndex = Math.floor(previousWheelRotation / segment);
  const nextIndex = Math.floor(nextWheelRotation / segment);
  return Math.max(0, nextIndex - previousIndex);
};
