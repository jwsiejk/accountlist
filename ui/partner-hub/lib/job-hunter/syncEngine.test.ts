import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JOB_HUNTER_STORAGE_KEY } from "./storage";
import { __private__, runJobSync } from "./syncEngine";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("job hunter sync engine", () => {
  it("runs board adapters and syncs jobs", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      JOB_HUNTER_STORAGE_KEY,
      JSON.stringify({
        sources: [
          { company: "Acme", boardType: "greenhouse", boardToken: "acme-gh" },
          { company: "Acme", boardType: "lever", boardToken: "acme-lever" },
        ],
      }),
    );

    const previousWindow = globalThis.window;
    const previousFetch = globalThis.fetch;

    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });

    const called: string[] = [];
    globalThis.fetch = (async (input: URL | RequestInfo) => {
      const url = String(input);
      called.push(url);

      if (url.includes("boards-api.greenhouse.io")) {
        return {
          ok: true,
          json: async () => ({
            jobs: [{ id: 10, title: " Engineer ", absolute_url: "https://gh/job/10", location: { name: " Remote " } }],
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => [
          { id: "abc", text: " PM ", hostedUrl: "https://lever/job/abc", categories: { location: "NYC" } },
        ],
      } as Response;
    }) as typeof fetch;

    const jobs = await runJobSync();

    assert.equal(called.length, 2);
    assert.ok(called.some((url) => url.includes("boards-api.greenhouse.io/v1/boards/acme-gh/jobs")));
    assert.ok(called.some((url) => url.includes("api.lever.co/v0/postings/acme-lever")));
    assert.equal(jobs.length, 2);

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true,
      writable: true,
    });
    globalThis.fetch = previousFetch;
  });

  it("normalizes jobs and deduplicates by stable id", () => {
    const normalized = __private__.normalizeJobs([
      {
        id: "lever:abc",
        externalId: "abc",
        company: " Acme ",
        title: " Product   Manager ",
        location: "Remote - US",
        source: "company-site",
        sourceUrl: "https://lever/job/abc",
        postedAt: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "lever:abc",
        externalId: "abc",
        company: "Acme",
        title: "Product Manager",
        location: "Remote",
        source: "company-site",
        sourceUrl: "https://lever/job/abc",
        postedAt: "2024-01-02T00:00:00.000Z",
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
    ]);

    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].id, "lever:abc");
    assert.equal(normalized[0].company, "Acme");
    assert.equal(normalized[0].title, "Product Manager");
    assert.equal(normalized[0].location, "Remote");
    assert.equal(normalized[0].postedAt, "2024-01-02T00:00:00.000Z");
  });
});
