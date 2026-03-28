"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const trainCatalog_1 = require("./trainCatalog");
const visuals_1 = require("./visuals");
(0, node_test_1.describe)("steam train visual helpers", () => {
    (0, node_test_1.it)("builds positive layouts for every stock train", () => {
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            const layout = (0, visuals_1.getTrainLayout)(train, 220, 8, 0.65);
            assert.equal(layout.fullConsistLength >= train.locomotive.bodyLength, true, `${train.id}: consist length`);
            assert.equal(layout.scale > 0, true, `${train.id}: scale`);
            assert.equal(layout.tenderStart > layout.locomotiveStart, true, `${train.id}: tender start`);
            assert.equal(layout.rollingStockStart >= layout.tenderStart, true, `${train.id}: rolling stock start`);
        });
    });
    (0, node_test_1.it)("keeps consist lengths stable and positive", () => {
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            const length = (0, visuals_1.getTrainConsistLength)(train);
            assert.equal(length > 100, true, `${train.id}: minimum length`);
            assert.equal(length >= train.locomotive.bodyLength, true, `${train.id}: locomotive not clipped`);
        });
    });
    (0, node_test_1.it)("returns stable silhouette metrics", () => {
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            const silhouette = (0, visuals_1.getLocomotiveSilhouette)(train.locomotive);
            assert.equal(silhouette.boilerLength > 0, true, `${train.id}: boiler length`);
            assert.equal(silhouette.smokeboxRadius > 0, true, `${train.id}: smokebox radius`);
            assert.equal(silhouette.cabRoofY < 0, true, `${train.id}: cab roof`);
        });
    });
    (0, node_test_1.it)("counts quarter-turn chuff pulses", () => {
        assert.equal((0, visuals_1.countChuffPulses)(0, Math.PI / 4), 0);
        assert.equal((0, visuals_1.countChuffPulses)(0, Math.PI / 2 + 0.01), 1);
        assert.equal((0, visuals_1.countChuffPulses)(0, Math.PI * 2 + 0.01), 4);
    });
    (0, node_test_1.it)("provides stable preview palette colors", () => {
        const palette = (0, visuals_1.getPreviewPalette)();
        assert.equal(typeof palette.railBedTop, "string");
        assert.equal(typeof palette.railSide, "string");
        assert.equal(typeof palette.sleeperTop, "string");
        assert.equal(typeof palette.skyTop, "string");
        assert.equal(typeof palette.sceneBrick, "string");
    });
    (0, node_test_1.it)("maps window color by train role", () => {
        assert.equal((0, visuals_1.getCarWindowColor)("starter-passenger"), "#ffefb5");
        assert.equal((0, visuals_1.getCarWindowColor)("starter-freight"), "#334155");
    });
    (0, node_test_1.it)("draws turnout geometry only when switch position is provided", () => {
        const calls = [];
        const ctx = {
            beginPath: () => calls.push("beginPath"),
            moveTo: (_x, _y) => calls.push("moveTo"),
            lineTo: (_x, _y) => calls.push("lineTo"),
            stroke: () => calls.push("stroke"),
            fillRect: (_x, _y, _w, _h) => calls.push("fillRect"),
            closePath: () => calls.push("closePath"),
            fill: () => calls.push("fill"),
            set strokeStyle(_value) { },
            set lineWidth(_value) { },
            set fillStyle(_value) { },
        };
        (0, visuals_1.drawTrackTurnout)(ctx, 100, {});
        assert.equal(calls.length, 0);
        (0, visuals_1.drawTrackTurnout)(ctx, 100, { switchX: 120, switchToSiding: true });
        assert.equal(calls.includes("fillRect"), true);
        assert.equal(calls.filter((call) => call === "stroke").length, 2);
        assert.equal(calls.filter((call) => call === "lineTo").length >= 3, true);
    });
});
