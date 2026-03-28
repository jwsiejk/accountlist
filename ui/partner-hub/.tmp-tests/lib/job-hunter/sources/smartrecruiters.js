"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSmartRecruitersJobs = fetchSmartRecruitersJobs;
const textCleanup_1 = require("../textCleanup");
const normalize_1 = require("../normalize");
const formatLocation = (location) => {
    if (!location) {
        return undefined;
    }
    if (location.remote) {
        return "Remote";
    }
    return [location.city, location.region, location.country].filter(Boolean).join(", ");
};
const fetchDetails = async (company, id) => {
    const endpoint = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(id)}`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
        return null;
    }
    return (await res.json());
};
const detailsNotes = (details) => {
    if (!details) {
        return undefined;
    }
    const sections = details.jobAd?.sections?.map((section) => `${section.title ? `${section.title}: ` : ""}${section.text ?? ""}`);
    return (0, textCleanup_1.buildCleanPostingSummary)(sections ?? [], { maxLength: 950 });
};
async function fetchSmartRecruitersJobs(source) {
    const endpoint = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(source.boardToken)}/postings?limit=100`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`SmartRecruiters fetch failed (${res.status})`);
    }
    const data = (await res.json());
    const jobs = Array.isArray(data.content) ? data.content : [];
    const normalized = await Promise.all(jobs
        .filter((job) => !!job.id && !!job.name)
        .map(async (job) => {
        const id = job.id;
        const details = await fetchDetails(source.boardToken, id);
        const salaryRange = (0, textCleanup_1.cleanInlineSourceText)(details?.compensation?.description, 120);
        return (0, normalize_1.normalizeJobPosting)({
            source: "smartrecruiters",
            externalId: id,
            company: source.company,
            title: job.name,
            location: formatLocation(job.location),
            department: job.department?.label,
            salaryRange,
            employmentType: job.typeOfEmployment,
            notes: detailsNotes(details),
            url: `https://jobs.smartrecruiters.com/${source.boardToken}/${id}`,
            postedAt: job.releasedDate,
        });
    }));
    return normalized;
}
