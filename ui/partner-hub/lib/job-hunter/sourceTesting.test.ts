import * as assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { testJobSource } from "./sourceTesting";

const previousFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = previousFetch;
});

describe("job hunter source testing", () => {
  it("returns success diagnostic with fetched count", async () => {
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({ jobs: [{ id: 1, title: "Engineer", absolute_url: "https://x/job/1" }] }),
      } as Response;
    }) as typeof fetch;

    const result = await testJobSource({ company: "Acme", boardType: "greenhouse", boardToken: "acme" });

    assert.equal(result.success, true);
    assert.equal(result.jobsFetched, 1);
    assert.equal(result.provider, "greenhouse");
    assert.equal(result.token, "acme");
  });

  it("returns failure diagnostic when provider fetch throws", async () => {
    globalThis.fetch = (async () => {
      throw new Error("bad token");
    }) as typeof fetch;

    const result = await testJobSource({ company: "Acme", boardType: "lever", boardToken: "bad" });

    assert.equal(result.success, false);
    assert.equal(result.jobsFetched, 0);
    assert.match(result.error ?? "", /bad token/i);
  });
});
