import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDefaultPreferences } from "./preferences";
import { JOB_HUNTER_STORAGE_KEY, isValidJobSourceConfig, loadJobHunterStore, saveJobHunterStore, validateJobSources } from "./storage";
import { getSourceValidationMessage, truncateBoardToken } from "./sourceSettings";

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


  it("hydrates legacy applications without checklist fields", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      JOB_HUNTER_STORAGE_KEY,
      JSON.stringify({
        jobsById: {},
        jobs: [],
        applicationsById: {
          "job-legacy": {
            id: "job-legacy",
            jobId: "job-legacy",
            status: "prepared",
            notes: "legacy note",
            createdAt: "2024-03-01T10:00:00.000Z",
            updatedAt: "2024-03-01T10:00:00.000Z",
          },
        },
      }),
    );

    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });

    const loaded = loadJobHunterStore();

    assert.equal(loaded.applicationsById["job-legacy"].notes, "legacy note");
    assert.equal(loaded.applicationsById["job-legacy"].checklist?.resumeReviewed, false);
    assert.equal(loaded.applicationsById["job-legacy"].checklist?.followUpScheduled, false);

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
      selectedJobIds: ["job-1"],
      sources: [{ company: "Acme", boardType: "greenhouse", boardToken: "acme" }],
      resumeProfile: {
        fullName: "James Wang",
        email: "james@example.com",
        phone: "555-0101",
        cityState: "Austin, TX",
        linkedinUrl: "https://linkedin.com/in/james",
        websiteUrl: "",
        workAuthorizationNote: "US Citizen",
        signatureLine: "Best regards,",
        headline: "Staff Engineer",
        summary: "Summary",
        skills: ["Architecture"],
        experience: [{ company: "Acme", title: "SA", bullets: ["Led implementation"] }],
        achievements: ["Improved win rates"],
      },
    });

    const loaded = loadJobHunterStore();
    assert.equal(loaded.sources.length, 1);
    assert.deepEqual(loaded.sources[0], { company: "Acme", boardType: "greenhouse", boardToken: "acme" });
    assert.equal(loaded.resumeProfile?.summary, "Summary");
    assert.deepEqual(loaded.selectedJobIds, ["job-1"]);

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true,
      writable: true,
    });
  });


  it("round-trips normalized preferences through local storage", () => {
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
      selectedJobIds: [],
      sources: [],
      preferences: {
        targetRoles: ["  Solutions Architect  ", ""],
        targetKeywords: ["AWS"],
        targetLocations: [" Remote "],
        remoteOnly: true,
        excludedCompanies: ["  BadCo "],
        excludedTitles: [" Senior Manager "],
        minimumScore: 120,
      },
    });

    const loaded = loadJobHunterStore();
    assert.deepEqual(loaded.preferences, {
      targetRoles: ["Solutions Architect"],
      targetKeywords: ["AWS"],
      targetLocations: ["Remote"],
      remoteOnly: true,
      excludedCompanies: ["BadCo"],
      excludedTitles: ["Senior Manager"],
      minimumScore: 100,
    });

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true,
      writable: true,
    });
  });

  it("hydrates default preferences when missing from stored payload", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      JOB_HUNTER_STORAGE_KEY,
      JSON.stringify({
        jobsById: {},
        jobs: [],
        sources: [],
        applications: [],
        applicationsById: {},
      }),
    );

    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });

    const loaded = loadJobHunterStore();
    assert.deepEqual(loaded.preferences, getDefaultPreferences());

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true,
      writable: true,
    });
  });


  it("hydrates selected queue safely", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      JOB_HUNTER_STORAGE_KEY,
      JSON.stringify({
        jobsById: {},
        jobs: [],
        selectedJobIds: ["job-1", "job-1", "", 42],
        sources: [],
        applications: [],
        applicationsById: {},
      }),
    );

    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });

    const loaded = loadJobHunterStore();
    assert.deepEqual(loaded.selectedJobIds, ["job-1"]);

    Object.defineProperty(globalThis, "window", {
      value: previousWindow,
      configurable: true,
      writable: true,
    });
  });


  it("returns an empty source list for non-array payloads", () => {
    assert.deepEqual(validateJobSources(null), []);
    assert.deepEqual(validateJobSources({ company: "Acme" }), []);
  });

  it("supports settings helper validation and token display", () => {
    assert.equal(truncateBoardToken("abcdefghijklmno"), "abcd...lmno");
    assert.equal(truncateBoardToken("short"), "short");

    assert.equal(
      getSourceValidationMessage(
        { company: " ", boardType: "greenhouse", boardToken: "token" },
        [{ company: "Acme", boardType: "greenhouse", boardToken: "token" }],
      ),
      "Company and board token are required.",
    );

    assert.equal(
      getSourceValidationMessage(
        { company: "Acme", boardType: "greenhouse", boardToken: " token " },
        [{ company: "Acme", boardType: "greenhouse", boardToken: "token" }],
      ),
      "That source already exists.",
    );
  });
});
