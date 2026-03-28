"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private__ = exports.runJobSync = exports.fetchJobsForSource = void 0;
const normalize_1 = require("./normalize");
const ashby_1 = require("./sources/ashby");
const greenhouse_1 = require("./sources/greenhouse");
const lever_1 = require("./sources/lever");
const smartrecruiters_1 = require("./sources/smartrecruiters");
const detectSourceProvider = (job) => {
    if (job.sourceProvider) {
        return job.sourceProvider;
    }
    const prefix = job.id.split(":")[0];
    if (prefix === "greenhouse" || prefix === "lever" || prefix === "ashby" || prefix === "smartrecruiters") {
        return prefix;
    }
    return "greenhouse";
};
const normalizeJobs = (jobs) => {
    const merged = new Map();
    jobs.forEach((job) => {
        const normalized = (0, normalize_1.normalizeJobPosting)({
            source: detectSourceProvider(job),
            externalId: job.externalId ?? job.id,
            company: job.company,
            title: job.title,
            location: job.location,
            department: job.department,
            salaryRange: job.salaryRange,
            employmentType: job.employmentType,
            notes: job.notes,
            url: job.sourceUrl ?? "",
            postedAt: job.postedAt,
        });
        const existing = merged.get(normalized.id);
        if (!existing) {
            merged.set(normalized.id, normalized);
            return;
        }
        const existingDate = existing.postedAt ?? existing.updatedAt;
        const normalizedDate = normalized.postedAt ?? normalized.updatedAt;
        if (normalizedDate >= existingDate) {
            merged.set(normalized.id, normalized);
        }
    });
    return Array.from(merged.values()).sort((a, b) => {
        const aDate = a.postedAt ?? a.updatedAt;
        const bDate = b.postedAt ?? b.updatedAt;
        return bDate.localeCompare(aDate);
    });
};
const fetchJobsForSource = async (source) => {
    if (source.boardType === "greenhouse") {
        return (0, greenhouse_1.fetchGreenhouseJobs)(source);
    }
    if (source.boardType === "lever") {
        return (0, lever_1.fetchLeverJobs)(source);
    }
    if (source.boardType === "ashby") {
        return (0, ashby_1.fetchAshbyJobs)(source);
    }
    if (source.boardType === "smartrecruiters") {
        return (0, smartrecruiters_1.fetchSmartRecruitersJobs)(source);
    }
    return [];
};
exports.fetchJobsForSource = fetchJobsForSource;
const toSourceId = (source) => `${source.boardType}:${source.boardToken}`;
const runJobSync = async (sources) => {
    const jobs = [];
    const diagnostics = [];
    for (const source of sources) {
        try {
            const results = await (0, exports.fetchJobsForSource)(source);
            jobs.push(...results);
            diagnostics.push({
                sourceId: toSourceId(source),
                company: source.company,
                provider: source.boardType,
                token: source.boardToken,
                success: true,
                jobsFetched: results.length,
            });
        }
        catch (error) {
            diagnostics.push({
                sourceId: toSourceId(source),
                company: source.company,
                provider: source.boardType,
                token: source.boardToken,
                success: false,
                jobsFetched: 0,
                error: error instanceof Error ? error.message : "Unknown sync error",
            });
        }
    }
    return {
        jobs: normalizeJobs(jobs),
        diagnostics,
    };
};
exports.runJobSync = runJobSync;
exports.__private__ = {
    normalizeJobs,
};
