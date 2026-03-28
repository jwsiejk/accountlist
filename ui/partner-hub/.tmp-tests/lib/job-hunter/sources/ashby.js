"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAshbyJobs = fetchAshbyJobs;
const textCleanup_1 = require("../textCleanup");
const normalize_1 = require("../normalize");
const parseSalary = (job) => {
    if (job.compensation?.compensationTierSummary) {
        return (0, textCleanup_1.cleanInlineSourceText)(job.compensation.compensationTierSummary, 120);
    }
    const tierSummary = job.compensation?.compensationTiers?.map((tier) => (0, textCleanup_1.cleanInlineSourceText)(tier.summary, 120)).find(Boolean);
    if (tierSummary) {
        return tierSummary;
    }
    const content = (0, textCleanup_1.cleanInlineSourceText)(job.descriptionPlain ?? job.descriptionHtml);
    if (!content) {
        return undefined;
    }
    const match = content.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
    return match ? (0, textCleanup_1.cleanInlineSourceText)(match[1], 120) : undefined;
};
const buildNotes = (job) => (0, textCleanup_1.buildCleanPostingSummary)([job.descriptionPlain, job.descriptionHtml, job.employmentType ? `Employment type: ${job.employmentType}` : undefined], {
    maxLength: 950,
});
async function fetchAshbyJobs(source) {
    const endpoint = "https://jobs.ashbyhq.com/api/non-user-portal/job-board";
    const res = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            organizationHostedJobsPageName: source.boardToken,
        }),
    });
    if (!res.ok) {
        throw new Error(`Ashby fetch failed (${res.status})`);
    }
    const data = (await res.json());
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    return jobs
        .filter((job) => !!job.id && !!job.title && !!job.jobUrl)
        .map((job) => (0, normalize_1.normalizeJobPosting)({
        source: "ashby",
        externalId: job.id,
        company: source.company,
        title: job.title,
        location: job.locationName ?? job.location?.locationName,
        department: job.departmentName,
        salaryRange: parseSalary(job),
        employmentType: job.employmentType,
        notes: buildNotes(job),
        url: job.jobUrl,
        postedAt: job.postedDate ?? job.createdAt,
    }));
}
