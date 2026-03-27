import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STEAM_TRAIN_CATALOG } from "./trainCatalog";

describe("steam train renderer safety", () => {
  it("keeps per-train geometry inside safe ranges for shared renderer", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const { locomotive } = train;
      const lastDriverX = locomotive.wheelSet.offsetX + (locomotive.wheelSet.count - 1) * locomotive.wheelSet.spacing;

      assert.equal(locomotive.wheelSet.offsetX > 0, true, `${train.id}: wheel offset`);
      assert.equal(lastDriverX < locomotive.bodyLength + 24, true, `${train.id}: wheel spread`);
      assert.equal(locomotive.stack !== undefined, true, `${train.id}: stack required`);
      assert.equal((locomotive.stack?.offsetY ?? 0) < -40, true, `${train.id}: stack vertical`);
      assert.equal(locomotive.cab !== undefined, true, `${train.id}: cab required`);
      assert.equal((locomotive.cab?.offsetX ?? 0) < locomotive.bodyLength, true, `${train.id}: cab horizontal`);

      if (train.tender) {
        assert.equal(train.tender.length >= 120, true, `${train.id}: tender length`);
        assert.equal(train.tender.height >= 50, true, `${train.id}: tender height`);
      }

      train.rollingStock.forEach((car) => {
        assert.equal(car.type === "car" || car.type === "tender", true, `${train.id}: car type`);
        assert.equal(car.length > 0 && car.height > 0, true, `${train.id}: car dimensions`);
      });
    });
  });
});
