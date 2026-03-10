import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applicationReducer,
  buildFollowUpEmail,
  createApplicationFromJob,
  exportApplicationsCsv,
  resolveApplicationJobDetails,
  toJobSnapshot,
} from "./applications";
import type { JobPosting } from "./types";

const job: JobPosting = {
  id: "job-1",
  title: "Product Manager",
  company: "Acme",
  source: "company-site",
  sourceUrl: "https://example.com/jobs/1",
  location: "Remote",
  department: "Product",
  postedAt: "2024-02-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("job hunter application reducer", () => {
  it("creates prepared application entries", () => {
    const created = createApplicationFromJob(job, "2024-03-01T10:00:00.000Z");

    assert.equal(created.status, "prepared");
    assert.equal(created.jobId, job.id);
    assert.equal(created.checklist?.resumeReviewed, false);
  });

  it("updates status timestamps", () => {
    const initial = {
      [job.id]: createApplicationFromJob(job, "2024-03-01T10:00:00.000Z"),
    };

    const applied = applicationReducer(initial, {
      type: "setStatus",
      jobId: job.id,
      status: "applied",
      now: "2024-03-02T10:00:00.000Z",
    });

    assert.equal(applied[job.id].appliedAt, "2024-03-02T10:00:00.000Z");
    assert.equal(applied[job.id].status, "applied");
  });

  it("updates checklist and notes", () => {
    const initial = { [job.id]: createApplicationFromJob(job, "2024-03-01T10:00:00.000Z") };
    const withChecklist = applicationReducer(initial, {
      type: "setChecklistItem",
      jobId: job.id,
      item: "resumeReviewed",
      value: true,
      now: "2024-03-02T10:00:00.000Z",
    });
    const withNotes = applicationReducer(withChecklist, {
      type: "setNotes",
      jobId: job.id,
      notes: "Submitted tailored resume and letter.",
      now: "2024-03-03T10:00:00.000Z",
    });

    assert.equal(withNotes[job.id].checklist?.resumeReviewed, true);
    assert.equal(withNotes[job.id].notes, "Submitted tailored resume and letter.");
  });

  it("captures immutable snapshot when requested", () => {
    const initial = { [job.id]: createApplicationFromJob(job, "2024-03-01T10:00:00.000Z") };
    const withSnapshot = applicationReducer(initial, {
      type: "ensureSnapshotFromJob",
      jobId: job.id,
      job,
      now: "2024-03-02T10:00:00.000Z",
    });

    assert.deepEqual(withSnapshot[job.id].jobSnapshot, toJobSnapshot(job));
  });

  it("falls back to snapshot when live job is missing", () => {
    const application = {
      ...createApplicationFromJob(job, "2024-03-01T10:00:00.000Z"),
      jobSnapshot: toJobSnapshot(job),
    };

    const details = resolveApplicationJobDetails(application, {});

    assert.equal(details.missingLiveJob, true);
    assert.equal(details.title, "Product Manager");
    assert.equal(details.company, "Acme");
  });


  it("builds follow-up email with candidate identity", () => {
    const email = buildFollowUpEmail(job, {
      fullName: "James Wang",
      email: "james@example.com",
      phone: "555-0101",
      cityState: "Austin, TX",
      linkedinUrl: "https://linkedin.com/in/james",
      websiteUrl: "",
      workAuthorizationNote: "US Citizen",
      signatureLine: "Sincerely,",
      headline: "Staff Engineer",
      summary: "Summary",
      skills: [],
      experience: [],
      achievements: [],
    });

    assert.ok(email.includes("Sincerely,"));
    assert.ok(email.includes("James Wang"));
    assert.ok(!email.includes("[Your Name]"));
  });

  it("exports applications as csv", () => {
    const applications = [
      {
        ...createApplicationFromJob(job, "2024-03-01T10:00:00.000Z"),
        status: "applied" as const,
        notes: "done",
      },
    ];

    const csv = exportApplicationsCsv(applications, { [job.id]: job });

    assert.match(csv, /"jobId","company","title","status","notes"/);
    assert.match(csv, /"job-1","Acme","Product Manager","applied","done"/);
  });
});
