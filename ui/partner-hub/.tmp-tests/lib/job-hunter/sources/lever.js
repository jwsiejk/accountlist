"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLeverJobs = fetchLeverJobs;
const textCleanup_1 = require("../textCleanup");
const normalize_1 = require("../normalize");
const collapse = (value) => value.trim().replace(/\s+/g, " ");
const parseSalary = (job) => {
    if (job.salaryRange) {
        return (0, textCleanup_1.cleanInlineSourceText)(job.salaryRange, 120);
    }
    if (job.compensation) {
        return (0, textCleanup_1.cleanInlineSourceText)(job.compensation, 120);
    }
    const content = [job.descriptionPlain, job.description, job.additional, ...((job.lists ?? []).map((item) => item.content ?? ""))]
        .map((part) => (0, textCleanup_1.cleanInlineSourceText)(part))
        .filter((part) => Boolean(part))
        .join(" ");
    const salaryMatch = content.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
    return salaryMatch ? collapse(salaryMatch[1]) : undefined;
};
const buildNotes = (job) => {
    const workplace = (0, textCleanup_1.cleanInlineSourceText)(job.workplaceType ?? job.categories?.workplaceType ?? "", 80);
    const commitment = (0, textCleanup_1.cleanInlineSourceText)(job.commitment ?? job.categories?.commitment ?? "", 80);
    return (0, textCleanup_1.buildCleanPostingSummary)([
        job.descriptionPlain,
        job.description,
        job.additional,
        ...((job.lists ?? []).map((entry) => `${entry.text ? `${collapse(entry.text)}: ` : ""}${entry.content ?? ""}`.trim())),
        workplace ? `Workplace: ${workplace}` : undefined,
        commitment ? `Commitment: ${commitment}` : undefined,
    ], { maxLength: 950 });
};
async function fetchLeverJobs(source) {
    const endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(source.boardToken)}?mode=json`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Lever fetch failed (${res.status})`);
    }
    const jobs = (await res.json());
    return jobs
        .filter((job) => !!job.id && !!job.text && !!job.hostedUrl)
        .map((job) => (0, normalize_1.normalizeJobPosting)({
        source: "lever",
        externalId: job.id,
        company: source.company,
        title: job.text,
        location: job.categories?.location,
        department: job.categories?.team,
        salaryRange: parseSalary(job),
        employmentType: job.commitment ?? job.categories?.commitment,
        notes: buildNotes(job),
        url: job.hostedUrl,
        postedAt: typeof job.createdAt === "number" ? new Date(job.createdAt).toISOString() : undefined,
    }));
}
