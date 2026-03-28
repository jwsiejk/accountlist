"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTrainPreviewCard = exports.drawLevelSceneDecor = exports.drawPreviewBackdrop = exports.drawSteamParticleRich = exports.drawTrainConsist = exports.drawTrackAndBallast = exports.drawTrackTurnout = exports.countChuffPulses = exports.getRodCyclePhase = exports.getLocomotiveSilhouette = exports.getTrainLayout = exports.getTrainConsistLength = exports.getCarWindowColor = exports.getPreviewPalette = exports.CAR_GAP = exports.LOCOMOTIVE_TO_TENDER_GAP = void 0;
const assetSystem_1 = require("./art/assetSystem");
exports.LOCOMOTIVE_TO_TENDER_GAP = 20;
exports.CAR_GAP = 10;
const getPreviewPalette = () => assetSystem_1.DEFAULT_TRAIN_ART_PALETTE;
exports.getPreviewPalette = getPreviewPalette;
const getCarWindowColor = (trainId) => (trainId.includes("passenger") ? "#ffefb5" : "#334155");
exports.getCarWindowColor = getCarWindowColor;
const getTrainConsistLength = (train, gaps = { locomotiveToTender: exports.LOCOMOTIVE_TO_TENDER_GAP, carGap: exports.CAR_GAP }) => {
    const tenderLength = train.tender?.length ?? 0;
    const rollingStockLength = train.rollingStock.reduce((total, car) => total + car.length, 0);
    const rollingStockSpacing = Math.max(0, train.rollingStock.length - 1) * gaps.carGap;
    return (train.locomotive.bodyLength +
        (train.tender ? gaps.locomotiveToTender + tenderLength : 0) +
        (train.rollingStock.length > 0 ? gaps.locomotiveToTender : 0) +
        rollingStockLength +
        rollingStockSpacing);
};
exports.getTrainConsistLength = getTrainConsistLength;
const getTrainLayout = (train, previewWidth, previewPadding, maxScale, gaps = { locomotiveToTender: exports.LOCOMOTIVE_TO_TENDER_GAP, carGap: exports.CAR_GAP }) => {
    const fullConsistLength = (0, exports.getTrainConsistLength)(train, gaps);
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
exports.getTrainLayout = getTrainLayout;
const getLocomotiveSilhouette = (locomotive) => {
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
exports.getLocomotiveSilhouette = getLocomotiveSilhouette;
const getRodCyclePhase = (wheelRotationRad) => ((wheelRotationRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
exports.getRodCyclePhase = getRodCyclePhase;
const countChuffPulses = (previousWheelRotation, nextWheelRotation) => {
    const segment = Math.PI / 2;
    const previousIndex = Math.floor(previousWheelRotation / segment);
    const nextIndex = Math.floor(nextWheelRotation / segment);
    return Math.max(0, nextIndex - previousIndex);
};
exports.countChuffPulses = countChuffPulses;
const drawTrackTurnout = (ctx, railY, options) => {
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
exports.drawTrackTurnout = drawTrackTurnout;
const drawTrackAndBallast = (ctx, width, railY, palette = assetSystem_1.DEFAULT_TRAIN_ART_PALETTE, options = {}) => {
    const switches = options.includeSwitchStand && options.switchX !== undefined ? [{ x: options.switchX, siding: Boolean(options.switchToSiding) }] : [];
    (0, assetSystem_1.drawTrackAsset)(ctx, width, railY, palette, switches);
};
exports.drawTrackAndBallast = drawTrackAndBallast;
const drawTrainConsist = (ctx, train, options) => {
    const scale = options.scale ?? 1;
    const wheelRotation = options.wheelRotationRad ?? 0;
    ctx.save();
    ctx.translate(options.baseX, options.baseY);
    ctx.scale(scale, scale);
    (0, assetSystem_1.drawCompositedTrainAsset)(ctx, train, 0, 0, wheelRotation, {
        locomotiveToTender: exports.LOCOMOTIVE_TO_TENDER_GAP,
        carGap: exports.CAR_GAP,
    });
    ctx.restore();
};
exports.drawTrainConsist = drawTrainConsist;
const drawSteamParticleRich = (ctx, particle, cameraX) => {
    (0, assetSystem_1.drawSteamAsset)(ctx, particle, cameraX);
};
exports.drawSteamParticleRich = drawSteamParticleRich;
const drawPreviewBackdrop = (ctx, width, height, palette = assetSystem_1.DEFAULT_TRAIN_ART_PALETTE) => {
    (0, assetSystem_1.drawBackdropAsset)(ctx, width, height, palette);
};
exports.drawPreviewBackdrop = drawPreviewBackdrop;
const drawLevelSceneDecor = (ctx, scene, width, railY, palette = assetSystem_1.DEFAULT_TRAIN_ART_PALETTE) => {
    (0, assetSystem_1.drawSceneAsset)(ctx, scene, width, railY, palette);
};
exports.drawLevelSceneDecor = drawLevelSceneDecor;
const renderTrainPreviewCard = (ctx, train, width, height, wheelRotationRad = 0) => {
    const palette = (0, exports.getPreviewPalette)();
    const layout = (0, exports.getTrainLayout)(train, width, 8, 0.68);
    (0, exports.drawPreviewBackdrop)(ctx, width, height, palette);
    const railY = Math.round(height * 0.76);
    (0, exports.drawTrackAndBallast)(ctx, width, railY, palette);
    (0, exports.drawTrainConsist)(ctx, train, {
        baseX: layout.locomotiveStart,
        baseY: railY + 2,
        wheelRotationRad,
        scale: layout.scale,
        palette,
    });
};
exports.renderTrainPreviewCard = renderTrainPreviewCard;
