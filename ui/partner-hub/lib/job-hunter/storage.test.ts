import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JOB_HUNTER_STORAGE_KEY, isValidJobSourceConfig, loadJobHunterStore, saveJobHunterStore, validateJobSources } from "./storage";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("job hunter storage", () => {
  it("hydrates applicationsById from legacy applications array", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      JOB_HUNTER_STORAGE_KEY,
      JSON.stringify({
        jobsById: {},
        jobs: [],
        applications: [
          {
            id: "job-1",
            jobId: "job-1",
            status: "prepared",
            createdAt: "2024-03-01T10:00:00.000Z",
            updatedAt: "2024-03-01T10:00:00.000Z",
          },
        ],
      }),
    );

    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });

    const loaded = loadJobHunterStore();

    assert.ok(loaded.applicationsById["job-1"]);
    assert.equal(loaded.applications.length, 1);

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true,
      writable: true,
    });
  });

  it("validates source payloads", () => {
    assert.equal(isValidJobSourceConfig({ company: "Acme", boardType: "greenhouse", boardToken: "acme" }), true);
    assert.equal(isValidJobSourceConfig({ company: "", boardType: "greenhouse", boardToken: "acme" }), false);
    assert.equal(isValidJobSourceConfig({ company: "Acme", boardType: "invalid", boardToken: "acme" }), false);
    assert.deepEqual(validateJobSources([{ company: " Acme ", boardType: "lever", boardToken: " acme " }, { nope: true }]), [
      { company: "Acme", boardType: "lever", boardToken: "acme" },
    ]);
  });

  it("round-trips sources through local storage", () => {
    const storage = new MemoryStorage();
    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });

    saveJobHunterStore({
      jobs: [],
      jobsById: {},
      applications: [],
      applicationsById: {},
      sources: [{ company: "Acme", boardType: "greenhouse", boardToken: "acme" }],
    });

    const loaded = loadJobHunterStore();
    assert.equal(loaded.sources.length, 1);
    assert.deepEqual(loaded.sources[0], { company: "Acme", boardType: "greenhouse", boardToken: "acme" });

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true,
      writable: true,
    });
  });
});
