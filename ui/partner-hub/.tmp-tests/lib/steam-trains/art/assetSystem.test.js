"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const trainCatalog_1 = require("../trainCatalog");
const assetSystem_1 = require("./assetSystem");
(0, node_test_1.describe)("steam train asset system", () => {
    (0, node_test_1.it)("provides stable default palette entries", () => {
        assert.equal(typeof assetSystem_1.DEFAULT_TRAIN_ART_PALETTE.railBedTop, "string");
        assert.equal(typeof assetSystem_1.DEFAULT_TRAIN_ART_PALETTE.railSide, "string");
        assert.equal(typeof assetSystem_1.DEFAULT_TRAIN_ART_PALETTE.sceneBrick, "string");
    });
    (0, node_test_1.it)("maps stock locomotives to material palettes", () => {
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            const materials = (0, assetSystem_1.getMaterialPalette)(train.locomotive);
            assert.equal(materials.paintedMetalTop, train.locomotive.color, `${train.id}: top color`);
            assert.equal(materials.brass, train.locomotive.trimColor, `${train.id}: trim color`);
            assert.equal(materials.steel.length > 0, true, `${train.id}: steel color`);
        });
    });
});
