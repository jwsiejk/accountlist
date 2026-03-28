"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawSteamAsset = exports.drawSceneAsset = exports.drawBackdropAsset = exports.drawTrackAsset = exports.drawCompositedTrainAsset = exports.drawCarAsset = exports.drawTenderAsset = exports.drawLocomotiveAsset = exports.getMaterialPalette = exports.DEFAULT_TRAIN_ART_PALETTE = void 0;
const vectorAssets_1 = require("./vectorAssets");
exports.DEFAULT_TRAIN_ART_PALETTE = {
    skyTop: "#6fa8d6",
    skyHorizon: "#dbe9f6",
    skyGlow: "#f8e2c4",
    groundTop: "#7f8f59",
    groundBottom: "#475236",
    mountain: "#6e8190",
    railBedTop: "#8f6b4e",
    railBedBottom: "#523625",
    ballastLight: "#a78567",
    ballastDark: "#644835",
    sleeperTop: "#5e422f",
    sleeperShadow: "#342214",
    railTop: "#e4ecf6",
    railSide: "#7f8996",
    sceneWood: "#6b4f36",
    sceneBrick: "#8d5a4d",
    foliageDark: "#2e4733",
    foliageLight: "#4f6b49",
};
const getMaterialPalette = (loco) => ({
    paintedMetalTop: loco.color,
    paintedMetalBottom: "#0b1220",
    soot: "#272f3d",
    sootDeep: "#0b0f16",
    brass: loco.trimColor,
    brassDark: "#7d581d",
    steel: "#c1cad4",
    steelDark: "#667180",
    glass: "#d8efff",
    cabShade: "#1f2a38",
});
exports.getMaterialPalette = getMaterialPalette;
const toPath = (path) => {
    if (typeof Path2D !== "undefined") {
        return new Path2D(path);
    }
    return path;
};
const replaceToken = (value, token, replacement) => value.split(token).join(replacement);
const renderLayer = (ctx, layer, colors) => {
    const alpha = layer.alpha ?? 1;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const substitutedPath = replaceToken(replaceToken(replaceToken(layer.path, "{alpha}", `${colors.alpha ?? "0.6"}`), "{alphaSoft}", `${colors.alphaSoft ?? "0.44"}`), "{alphaSmoke}", `${colors.alphaSmoke ?? "0.2"}`);
    if (layer.fill) {
        const fill = replaceToken(replaceToken(layer.fill, "{paint}", colors.paint), "{trim}", colors.trim);
        ctx.fillStyle = fill;
        const path = toPath(substitutedPath);
        if (typeof path === "string") {
            // fallback for tests/limited contexts
            ctx.beginPath();
        }
        else {
            ctx.fill(path);
        }
    }
    if (layer.stroke) {
        ctx.strokeStyle = replaceToken(replaceToken(layer.stroke, "{paint}", colors.paint), "{trim}", colors.trim);
        ctx.lineWidth = layer.lineWidth ?? 2;
        const path = toPath(substitutedPath);
        if (typeof path !== "string") {
            ctx.stroke(path);
        }
    }
    ctx.restore();
};
const drawWheelAsset = (ctx, x, y, radius, rotation, trimColor) => {
    const plate = ctx.createRadialGradient(x - radius * 0.24, y - radius * 0.3, 2, x, y, radius);
    plate.addColorStop(0, "#f3f7fb");
    plate.addColorStop(0.45, "#a8b5c6");
    plate.addColorStop(1, "#101722");
    ctx.fillStyle = plate;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    const spokeCount = Math.max(7, Math.round(radius / 3.8));
    ctx.strokeStyle = "#a0acbd";
    ctx.lineWidth = Math.max(1.5, radius * 0.08);
    for (let i = 0; i < spokeCount; i += 1) {
        const a = rotation + (Math.PI * 2 * i) / spokeCount;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * (radius - 4), y + Math.sin(a) * (radius - 4));
        ctx.stroke();
    }
    ctx.strokeStyle = "#d4deea";
    ctx.lineWidth = Math.max(2, radius * 0.12);
    ctx.beginPath();
    ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(4, radius * 0.18), 0, Math.PI * 2);
    ctx.fill();
};
const drawRunningGear = (ctx, loco, baseX, baseY, wheelRotation, trimColor) => {
    const centers = Array.from({ length: loco.wheelSet.count }).map((_, idx) => {
        const x = baseX + loco.wheelSet.offsetX + idx * loco.wheelSet.spacing;
        drawWheelAsset(ctx, x, baseY, loco.wheelSet.radius, wheelRotation + idx * 0.12, trimColor);
        return { x, y: baseY };
    });
    const drawTruck = (count, radius, offsetX, spacing, yOffset, phase) => {
        for (let i = 0; i < count; i += 1) {
            drawWheelAsset(ctx, baseX + offsetX + i * spacing, baseY + yOffset, radius, wheelRotation * phase + i * 0.2, "#c9d2df");
        }
    };
    if (loco.pilotWheels)
        drawTruck(loco.pilotWheels.count, loco.pilotWheels.radius, loco.pilotWheels.offsetX, loco.pilotWheels.spacing, loco.pilotWheels.yOffset ?? -2, 0.86);
    if (loco.trailingWheels)
        drawTruck(loco.trailingWheels.count, loco.trailingWheels.radius, loco.trailingWheels.offsetX, loco.trailingWheels.spacing, loco.trailingWheels.yOffset ?? -2, 0.72);
    const rod = loco.drivingRod;
    const lead = centers[0];
    const crankCenter = centers[Math.min(centers.length - 1, rod.wheelIndex)];
    const tail = centers[centers.length - 1];
    const phase = wheelRotation % (Math.PI * 2);
    const crankX = crankCenter.x + Math.cos(phase) * rod.crankRadius;
    const crankY = crankCenter.y + Math.sin(phase) * rod.crankRadius;
    const valveX = lead.x - rod.rodLength * 0.45;
    const valveY = crankY + rod.anchorOffsetY;
    ctx.fillStyle = "#4b5f79";
    ctx.fillRect(valveX - 28, valveY - 8, 28, 16);
    ctx.strokeStyle = "#c8973d";
    ctx.lineWidth = rod.thickness;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(valveX, valveY);
    ctx.lineTo(crankX, crankY);
    ctx.lineTo(tail.x + 14, tail.y - 2);
    ctx.stroke();
    const couplingY = crankCenter.y + Math.sin(phase + 0.15) * rod.crankRadius * 0.85;
    const couplingX = lead.x + Math.cos(phase + 0.15) * rod.crankRadius * 0.85;
    ctx.strokeStyle = "#af7e2b";
    ctx.lineWidth = Math.max(3, rod.thickness - 2);
    ctx.beginPath();
    ctx.moveTo(couplingX, couplingY);
    ctx.lineTo(crankX, crankY);
    ctx.lineTo(lead.x + 12, lead.y - 1);
    ctx.stroke();
    [
        [crankX, crankY],
        [couplingX, couplingY],
        [valveX, valveY],
    ].forEach(([x, y]) => {
        ctx.fillStyle = "#eec268";
        ctx.beginPath();
        ctx.arc(x, y, 4.2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.lineCap = "butt";
};
const drawLocomotiveAsset = (ctx, loco, x, baseY, wheelRotation) => {
    const family = (0, vectorAssets_1.pickLocomotiveAssetFamily)(loco);
    const colors = { paint: loco.color, trim: loco.trimColor };
    ctx.save();
    ctx.translate(x, baseY);
    [family.pilot, family.runningBoard, family.bodyShell, family.smokeboxFront, family.stack, family.cab, family.headlamp].forEach((group) => {
        group.forEach((layer) => renderLayer(ctx, layer, colors));
    });
    drawRunningGear(ctx, loco, 0, -1, wheelRotation, loco.trimColor);
    ctx.restore();
    return x + loco.bodyLength + 10;
};
exports.drawLocomotiveAsset = drawLocomotiveAsset;
const drawCoupler = (ctx, leftX, rightX, y) => {
    ctx.strokeStyle = "#202938";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(leftX, y - 8);
    ctx.lineTo((leftX + rightX) / 2, y - 5);
    ctx.lineTo(rightX, y - 8);
    ctx.stroke();
    ctx.lineCap = "butt";
};
const drawTenderAsset = (ctx, tender, x, baseY, wheelRotation) => {
    ctx.save();
    ctx.translate(x, baseY);
    vectorAssets_1.TENDER_ASSET_LAYERS.forEach((layer) => renderLayer(ctx, layer, { paint: tender.color, trim: "#c39a3e" }));
    drawWheelAsset(ctx, 38, -2, 18, wheelRotation, "#d5ddea");
    drawWheelAsset(ctx, Math.max(50, tender.length - 44), -2, 18, wheelRotation + 0.2, "#d5ddea");
    ctx.restore();
    return x + tender.length;
};
exports.drawTenderAsset = drawTenderAsset;
const drawCarAsset = (ctx, train, car, x, baseY, wheelRotation) => {
    ctx.save();
    ctx.translate(x, baseY);
    (0, vectorAssets_1.resolveTrainCarLayers)(train).forEach((layer) => renderLayer(ctx, layer, { paint: car.color, trim: "#d9b86b" }));
    drawWheelAsset(ctx, 24, -2, 14, wheelRotation, "#cad4e1");
    drawWheelAsset(ctx, Math.max(34, car.length - 26), -2, 14, wheelRotation + 0.2, "#cad4e1");
    ctx.restore();
    return x + car.length;
};
exports.drawCarAsset = drawCarAsset;
const drawCompositedTrainAsset = (ctx, train, baseX, baseY, wheelRotation, gaps) => {
    const locoTail = (0, exports.drawLocomotiveAsset)(ctx, train.locomotive, baseX, baseY, wheelRotation);
    let cursor = baseX + train.locomotive.bodyLength + gaps.locomotiveToTender;
    let previousCoupler = locoTail;
    if (train.tender) {
        drawCoupler(ctx, previousCoupler, cursor + 2, baseY);
        const end = (0, exports.drawTenderAsset)(ctx, train.tender, cursor, baseY, wheelRotation);
        previousCoupler = end - 2;
        cursor = end + gaps.locomotiveToTender;
    }
    train.rollingStock.forEach((car) => {
        drawCoupler(ctx, previousCoupler, cursor + 2, baseY);
        const end = (0, exports.drawCarAsset)(ctx, train, car, cursor, baseY, wheelRotation);
        previousCoupler = end - 2;
        cursor = end + gaps.carGap + 6;
    });
};
exports.drawCompositedTrainAsset = drawCompositedTrainAsset;
const drawTrackAsset = (ctx, width, railY, palette, switches = []) => {
    const railBed = ctx.createLinearGradient(0, railY - 6, 0, railY + 64);
    railBed.addColorStop(0, palette.railBedTop);
    railBed.addColorStop(1, palette.railBedBottom);
    ctx.fillStyle = railBed;
    ctx.fillRect(0, railY - 8, width, 56);
    for (let x = -40; x < width + 40; x += 9) {
        ctx.fillStyle = x % 2 === 0 ? palette.ballastDark : palette.ballastLight;
        ctx.beginPath();
        ctx.moveTo(x, railY + 22);
        ctx.lineTo(x + 6, railY + 26 + (x % 4));
        ctx.lineTo(x + 2, railY + 31);
        ctx.closePath();
        ctx.fill();
    }
    for (let x = -30; x < width + 50; x += 24) {
        ctx.fillStyle = palette.sleeperTop;
        ctx.fillRect(x, railY + 2, 18, 17);
        ctx.fillStyle = palette.sleeperShadow;
        ctx.fillRect(x + 1, railY + 13, 16, 4);
    }
    const railGrad = ctx.createLinearGradient(0, railY - 5, 0, railY + 20);
    railGrad.addColorStop(0, palette.railTop);
    railGrad.addColorStop(1, palette.railSide);
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, railY - 5, width, 7);
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
exports.drawTrackAsset = drawTrackAsset;
const drawBackdropAsset = (ctx, width, height, palette) => {
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.8);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(0.62, palette.skyHorizon);
    sky.addColorStop(1, palette.skyGlow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height * 0.82);
    const mountain = ctx.createLinearGradient(0, height * 0.42, 0, height * 0.76);
    mountain.addColorStop(0, "rgba(84, 108, 124, 0.35)");
    mountain.addColorStop(1, "rgba(57, 74, 88, 0.56)");
    ctx.fillStyle = mountain;
    for (let i = 0; i < 6; i += 1) {
        const peakX = i * (width / 5);
        ctx.beginPath();
        ctx.moveTo(peakX - 130, height * 0.74);
        ctx.lineTo(peakX, height * 0.44 + (i % 2) * 20);
        ctx.lineTo(peakX + 180, height * 0.74);
        ctx.closePath();
        ctx.fill();
    }
    const ground = ctx.createLinearGradient(0, height * 0.72, 0, height);
    ground.addColorStop(0, palette.groundTop);
    ground.addColorStop(1, palette.groundBottom);
    ctx.fillStyle = ground;
    ctx.fillRect(0, height * 0.72, width, height * 0.28);
};
exports.drawBackdropAsset = drawBackdropAsset;
const drawSceneAsset = (ctx, scene, width, railY, _palette) => {
    ctx.save();
    ctx.translate(0, railY);
    ctx.fillStyle = "rgba(36, 59, 43, 0.35)";
    for (let i = 0; i < 7; i += 1) {
        const baseX = i * 170;
        ctx.beginPath();
        ctx.moveTo(baseX, -60);
        ctx.quadraticCurveTo(baseX + 78, -122, baseX + 156, -60);
        ctx.lineTo(baseX + 156, 70);
        ctx.lineTo(baseX, 70);
        ctx.closePath();
        ctx.fill();
    }
    const layers = vectorAssets_1.SCENE_LAYERS[scene];
    layers.forEach((layer) => renderLayer(ctx, layer, { paint: "#000", trim: "#000" }));
    ctx.restore();
    if (scene === "bridge") {
        const water = ctx.createLinearGradient(0, railY + 112, 0, railY + 250);
        water.addColorStop(0, "rgba(87, 157, 214, 0.78)");
        water.addColorStop(1, "rgba(18, 62, 107, 0.88)");
        ctx.fillStyle = water;
        ctx.fillRect(0, railY + 112, width, 140);
    }
};
exports.drawSceneAsset = drawSceneAsset;
const drawSteamAsset = (ctx, particle, cameraX) => {
    const x = particle.x - cameraX;
    const alpha = Math.max(0.04, particle.alpha);
    ctx.save();
    ctx.translate(x - particle.radius * 0.64, particle.y + particle.radius * 0.2);
    ctx.scale(Math.max(0.4, particle.radius / 28), Math.max(0.4, particle.radius / 28));
    vectorAssets_1.STEAM_PLUME_LAYERS.forEach((layer) => renderLayer(ctx, layer, {
        paint: "#fff",
        trim: "#fff",
        alpha: alpha.toFixed(3),
        alphaSoft: (alpha * 0.72).toFixed(3),
        alphaSmoke: (alpha * 0.42).toFixed(3),
    }));
    ctx.restore();
    const haze = ctx.createRadialGradient(x - particle.radius * 0.2, particle.y - particle.radius * 0.2, 1, x, particle.y, particle.radius * 1.55);
    haze.addColorStop(0, `rgba(255,255,255,${alpha * 0.52})`);
    haze.addColorStop(0.5, `rgba(220,227,236,${alpha * 0.3})`);
    haze.addColorStop(1, `rgba(116,128,146,${alpha * 0.08})`);
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(x, particle.y, particle.radius * 1.25, 0, Math.PI * 2);
    ctx.fill();
};
exports.drawSteamAsset = drawSteamAsset;
