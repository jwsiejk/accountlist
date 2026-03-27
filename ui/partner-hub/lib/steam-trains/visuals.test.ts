import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STEAM_TRAIN_CATALOG } from "./trainCatalog";
import {
  countChuffPulses,
  drawTrackTurnout,
  getCarWindowColor,
  getLocomotiveSilhouette,
  getPreviewPalette,
  getTrainConsistLength,
  getTrainLayout,
} from "./visuals";

describe("steam train visual helpers", () => {
  it("builds positive layouts for every stock train", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const layout = getTrainLayout(train, 220, 8, 0.65);
      assert.equal(layout.fullConsistLength >= train.locomotive.bodyLength, true, `${train.id}: consist length`);
      assert.equal(layout.scale > 0, true, `${train.id}: scale`);
      assert.equal(layout.tenderStart > layout.locomotiveStart, true, `${train.id}: tender start`);
      assert.equal(layout.rollingStockStart >= layout.tenderStart, true, `${train.id}: rolling stock start`);
    });
  });

  it("keeps consist lengths stable and positive", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const length = getTrainConsistLength(train);
      assert.equal(length > 100, true, `${train.id}: minimum length`);
      assert.equal(length >= train.locomotive.bodyLength, true, `${train.id}: locomotive not clipped`);
    });
  });

  it("returns stable silhouette metrics", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const silhouette = getLocomotiveSilhouette(train.locomotive);
      assert.equal(silhouette.boilerLength > 0, true, `${train.id}: boiler length`);
      assert.equal(silhouette.smokeboxRadius > 0, true, `${train.id}: smokebox radius`);
      assert.equal(silhouette.cabRoofY < 0, true, `${train.id}: cab roof`);
    });
  });

  it("counts quarter-turn chuff pulses", () => {
    assert.equal(countChuffPulses(0, Math.PI / 4), 0);
    assert.equal(countChuffPulses(0, Math.PI / 2 + 0.01), 1);
    assert.equal(countChuffPulses(0, Math.PI * 2 + 0.01), 4);
  });

  it("provides stable preview palette colors", () => {
    const palette = getPreviewPalette();
    assert.equal(typeof palette.railBed, "string");
    assert.equal(typeof palette.wheelFill, "string");
    assert.equal(typeof palette.runningBoard, "string");
    assert.equal(typeof palette.skyTop, "string");
    assert.equal(typeof palette.brass, "string");
  });

  it("maps window color by train role", () => {
    assert.equal(getCarWindowColor("starter-passenger"), "#fef3c7");
    assert.equal(getCarWindowColor("starter-freight"), "#334155");
  });

  it("draws turnout geometry only when switch position is provided", () => {
    const calls: string[] = [];
    const ctx = {
      beginPath: () => calls.push("beginPath"),
      moveTo: (_x: number, _y: number) => calls.push("moveTo"),
      lineTo: (_x: number, _y: number) => calls.push("lineTo"),
      stroke: () => calls.push("stroke"),
      fillRect: (_x: number, _y: number, _w: number, _h: number) => calls.push("fillRect"),
      closePath: () => calls.push("closePath"),
      fill: () => calls.push("fill"),
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set fillStyle(_value: string) {},
    } as unknown as CanvasRenderingContext2D;

    drawTrackTurnout(ctx, 100, {});
    assert.equal(calls.length, 0);

    drawTrackTurnout(ctx, 100, { switchX: 120, switchToSiding: true });
    assert.equal(calls.includes("fillRect"), true);
    assert.equal(calls.filter((call) => call === "stroke").length, 2);
    assert.equal(calls.filter((call) => call === "lineTo").length >= 3, true);
  });
});
