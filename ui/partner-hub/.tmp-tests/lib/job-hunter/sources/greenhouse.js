"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGreenhouseJobs = fetchGreenhouseJobs;
const textCleanup_1 = require("../textCleanup");
const normalize_1 = require("../normalize");
const collapse = (value) => value.trim().replace(/\s+/g, " ");
const findMetadataValue = (metadata, match) => {
    const entry = metadata?.find((item) => match.test(item.name ?? ""));
    return entry?.value ? (0, textCleanup_1.cleanInlineSourceText)(entry.value, 160) : undefined;
};
const getSalaryRange = (job) => {
    const metadataComp = findMetadataValue(job.metadata, /(salary|compensation|pay range|base pay)/i);
    if (metadataComp) {
        return metadataComp;
    }
    const contentText = (0, textCleanup_1.cleanInlineSourceText)(job.content);
    if (!contentText) {
        return undefined;
    }
    const salaryMatch = contentText.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
    return salaryMatch ? collapse(salaryMatch[1]) : undefined;
};
const buildNotes = (job) => {
    const employment = findMetadataValue(job.metadata, /employment type|job type/i);
    const seniority = findMetadataValue(job.metadata, /(experience|seniority)/i);
    const hiringNotes = findMetadataValue(job.metadata, /(travel|visa|clearance)/i);
    return (0, textCleanup_1.buildCleanPostingSummary)([
        job.content,
        employment ? `Employment type: ${employment}` : undefined,
        seniority ? `Level: ${seniority}` : undefined,
        hiringNotes ? `Hiring notes: ${hiringNotes}` : undefined,
    ], { maxLength: 950 });
};
async function fetchGreenhouseJobs(source) {
    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.boardToken)}/jobs?content=true`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Greenhouse fetch failed (${res.status})`);
    }
    const data = (await res.json());
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    return jobs
        .filter((job) => !!job.id && !!job.title && !!job.absolute_url)
        .map((job) => {
        const employmentType = findMetadataValue(job.metadata, /employment type|job type/i);
        return (0, normalize_1.normalizeJobPosting)({
            source: "greenhouse",
            externalId: job.id,
            company: source.company,
            title: job.title,
            location: job.location?.name,
            department: job.departments?.[0]?.name,
            salaryRange: getSalaryRange(job),
            employmentType,
            notes: buildNotes(job),
            url: job.absolute_url,
            postedAt: job.updated_at,
        });
    });
}
