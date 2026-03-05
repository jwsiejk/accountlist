import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JOB_HUNTER_STORAGE_KEY, loadJobHunterStore } from "./storage";

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
});
