"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const applications_1 = require("./applications");
const job = {
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
(0, node_test_1.describe)("job hunter application reducer", () => {
    (0, node_test_1.it)("creates prepared application entries", () => {
        const created = (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z");
        assert.equal(created.status, "prepared");
        assert.equal(created.jobId, job.id);
        assert.equal(created.checklist?.resumeReviewed, false);
    });
    (0, node_test_1.it)("updates status timestamps", () => {
        const initial = {
            [job.id]: (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z"),
        };
        const applied = (0, applications_1.applicationReducer)(initial, {
            type: "setStatus",
            jobId: job.id,
            status: "applied",
            now: "2024-03-02T10:00:00.000Z",
        });
        assert.equal(applied[job.id].appliedAt, "2024-03-02T10:00:00.000Z");
        assert.equal(applied[job.id].status, "applied");
    });
    (0, node_test_1.it)("updates checklist and notes", () => {
        const initial = { [job.id]: (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z") };
        const withChecklist = (0, applications_1.applicationReducer)(initial, {
            type: "setChecklistItem",
            jobId: job.id,
            item: "resumeReviewed",
            value: true,
            now: "2024-03-02T10:00:00.000Z",
        });
        const withNotes = (0, applications_1.applicationReducer)(withChecklist, {
            type: "setNotes",
            jobId: job.id,
            notes: "Submitted tailored resume and letter.",
            now: "2024-03-03T10:00:00.000Z",
        });
        assert.equal(withNotes[job.id].checklist?.resumeReviewed, true);
        assert.equal(withNotes[job.id].workflow?.tailoredResumeReady, true);
        assert.equal(withNotes[job.id].notes, "Submitted tailored resume and letter.");
    });
    (0, node_test_1.it)("does not classify unselected jobs as selected", () => {
        const initial = { [job.id]: (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z") };
        assert.equal((0, applications_1.getApplicationQueueStage)(initial[job.id]), "untracked");
        assert.equal((0, applications_1.shouldShowInApplicationsPipeline)(initial[job.id]), false);
    });
    (0, node_test_1.it)("syncs workflow selection both directions with apply queue", () => {
        const initial = { [job.id]: (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z") };
        const addedToQueue = (0, applications_1.syncWorkflowSelectionWithQueue)(initial, [job.id], "2024-03-02T10:00:00.000Z");
        assert.equal((0, applications_1.getApplicationWorkflow)(addedToQueue[job.id]).selectedForApply, true);
        const removedFromQueue = (0, applications_1.syncWorkflowSelectionWithQueue)(addedToQueue, [], "2024-03-03T10:00:00.000Z");
        assert.equal((0, applications_1.getApplicationWorkflow)(removedFromQueue[job.id]).selectedForApply, false);
    });
    (0, node_test_1.it)("preserves workflow selection when removed from queue after in-progress signals", () => {
        const initial = { [job.id]: (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z") };
        const selected = (0, applications_1.syncWorkflowSelectionWithQueue)(initial, [job.id], "2024-03-02T10:00:00.000Z");
        const inProgress = (0, applications_1.applicationReducer)(selected, {
            type: "setWorkflowItem",
            jobId: job.id,
            item: "externalApplicationOpened",
            value: true,
            now: "2024-03-03T10:00:00.000Z",
        });
        const removedFromQueue = (0, applications_1.syncWorkflowSelectionWithQueue)(inProgress, [], "2024-03-04T10:00:00.000Z");
        assert.equal((0, applications_1.getApplicationWorkflow)(removedFromQueue[job.id]).selectedForApply, true);
        assert.equal((0, applications_1.getApplicationQueueStage)(removedFromQueue[job.id]), "in-progress");
        assert.equal((0, applications_1.shouldShowInApplicationsPipeline)(removedFromQueue[job.id]), true);
    });
    (0, node_test_1.it)("supports guided apply workflow transitions", () => {
        const initial = { [job.id]: (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z") };
        const selected = (0, applications_1.applicationReducer)(initial, {
            type: "setWorkflowItem",
            jobId: job.id,
            item: "selectedForApply",
            value: true,
            now: "2024-03-02T10:00:00.000Z",
        });
        const prepared = (0, applications_1.applicationReducer)(selected, {
            type: "setWorkflowItem",
            jobId: job.id,
            item: "tailoredResumeReady",
            value: true,
        });
        const ready = (0, applications_1.applicationReducer)(prepared, {
            type: "setWorkflowItem",
            jobId: job.id,
            item: "coverLetterReady",
            value: true,
        });
        const withScreener = (0, applications_1.applicationReducer)(ready, {
            type: "setWorkflowItem",
            jobId: job.id,
            item: "screenerAnswersReady",
            value: true,
        });
        const inProgress = (0, applications_1.applicationReducer)(withScreener, {
            type: "setWorkflowItem",
            jobId: job.id,
            item: "externalApplicationOpened",
            value: true,
        });
        const applied = (0, applications_1.applicationReducer)(inProgress, {
            type: "setStatus",
            jobId: job.id,
            status: "applied",
            now: "2024-03-03T10:00:00.000Z",
        });
        assert.equal((0, applications_1.getApplicationQueueStage)(selected[job.id]), "selected");
        assert.equal((0, applications_1.getApplicationQueueStage)(withScreener[job.id]), "prepared");
        assert.equal((0, applications_1.getApplicationQueueStage)(inProgress[job.id]), "in-progress");
        assert.equal((0, applications_1.getApplicationQueueStage)(applied[job.id]), "applied");
        assert.equal((0, applications_1.getApplicationWorkflow)(applied[job.id]).finalExternalSubmitConfirmed, true);
    });
    (0, node_test_1.it)("captures immutable snapshot when requested", () => {
        const initial = { [job.id]: (0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z") };
        const withSnapshot = (0, applications_1.applicationReducer)(initial, {
            type: "ensureSnapshotFromJob",
            jobId: job.id,
            job,
            now: "2024-03-02T10:00:00.000Z",
        });
        assert.deepEqual(withSnapshot[job.id].jobSnapshot, (0, applications_1.toJobSnapshot)(job));
    });
    (0, node_test_1.it)("falls back to snapshot when live job is missing", () => {
        const application = {
            ...(0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z"),
            jobSnapshot: (0, applications_1.toJobSnapshot)(job),
        };
        const details = (0, applications_1.resolveApplicationJobDetails)(application, {});
        assert.equal(details.missingLiveJob, true);
        assert.equal(details.title, "Product Manager");
        assert.equal(details.company, "Acme");
    });
    (0, node_test_1.it)("builds follow-up email with candidate identity", () => {
        const email = (0, applications_1.buildFollowUpEmail)(job, {
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
    (0, node_test_1.it)("exports applications as csv", () => {
        const applications = [
            {
                ...(0, applications_1.createApplicationFromJob)(job, "2024-03-01T10:00:00.000Z"),
                status: "applied",
                notes: "done",
            },
        ];
        const csv = (0, applications_1.exportApplicationsCsv)(applications, { [job.id]: job });
        assert.match(csv, /"jobId","company","title","status","notes"/);
        assert.match(csv, /"job-1","Acme","Product Manager","applied","done"/);
    });
});
