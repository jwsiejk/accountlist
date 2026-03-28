"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreJobFit = exports.summarizeJobReason = void 0;
const keywordConfig_1 = require("./keywordConfig");
const preferences_1 = require("./preferences");
const summarizeJobReason = (params) => {
    if (params.excluded && params.exclusionReasons.length > 0) {
        return `Excluded: ${params.exclusionReasons.join(", ")}`;
    }
    return params.preferenceSignals[0] ?? "No preference signal";
};
exports.summarizeJobReason = summarizeJobReason;
const normalizeText = (value) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
const buildSearchableText = (job) => {
    return normalizeText([job.title, job.company, job.department, job.location, job.notes, job.employmentType, job.salaryRange]
        .filter((part) => Boolean(part))
        .join(" "));
};
const includesAny = (value, terms) => {
    const haystack = normalizeText(value ?? "");
    return terms.find((term) => haystack.includes(normalizeText(term)));
};
const scoreJobFit = (job, preferences) => {
    const searchableText = buildSearchableText(job);
    const totalWeight = keywordConfig_1.JOB_FIT_KEYWORDS.reduce((sum, item) => sum + item.weight, 0);
    let matchedWeight = 0;
    const matched = [];
    const missing = [];
    for (const item of keywordConfig_1.JOB_FIT_KEYWORDS) {
        const terms = [item.keyword, ...(item.aliases ?? [])].map(normalizeText);
        const matchedTerm = terms.find((term) => searchableText.includes(term));
        if (matchedTerm) {
            matchedWeight += item.weight;
            matched.push({ keyword: item.keyword, weight: item.weight, matchedTerm });
        }
        else {
            missing.push({ keyword: item.keyword, weight: item.weight });
        }
    }
    let score = Math.round((matchedWeight / Math.max(totalWeight, 1)) * 100);
    const appliedPreferences = preferences ?? (0, preferences_1.getDefaultPreferences)();
    const preferenceSignals = [];
    const arrangement = (0, preferences_1.classifyWorkArrangement)(job);
    const arrangementText = (0, preferences_1.buildArrangementPreferenceText)(job);
    const matchedRole = includesAny(job.title, appliedPreferences.targetRoles);
    if (matchedRole) {
        score += 12;
        preferenceSignals.push(`Matched target role: ${matchedRole.toLowerCase()}`);
    }
    const matchedKeyword = appliedPreferences.targetKeywords.find((keyword) => searchableText.includes(normalizeText(keyword)));
    if (matchedKeyword) {
        score += 8;
        preferenceSignals.push(`Matched target keyword: ${matchedKeyword.toLowerCase()}`);
    }
    const matchedHybridLocation = includesAny(arrangementText, appliedPreferences.preferredHybridLocations);
    if (matchedHybridLocation && arrangement === "hybrid") {
        score += 6;
        preferenceSignals.push(`Matched hybrid location: ${matchedHybridLocation.toLowerCase()}`);
    }
    const matchedRemoteRegion = includesAny(arrangementText, appliedPreferences.preferredRemoteRegions);
    if (matchedRemoteRegion && arrangement === "remote") {
        score += 6;
        preferenceSignals.push(`Matched remote region: ${matchedRemoteRegion.toLowerCase()}`);
    }
    if (arrangement === "unknown") {
        score -= 4;
        preferenceSignals.push("Work arrangement unknown");
    }
    if (arrangement === "onsite" && !appliedPreferences.allowOnsiteRoles) {
        score -= 20;
        preferenceSignals.push("Onsite preference unmet");
    }
    if (includesAny(job.company, appliedPreferences.excludedCompanies)) {
        score = 0;
        preferenceSignals.push("Excluded company match");
    }
    if (includesAny(job.title, appliedPreferences.excludedTitles)) {
        score = 0;
        preferenceSignals.push("Excluded title match");
    }
    score = Math.max(0, Math.min(100, score));
    return {
        score,
        matched: matched.sort((a, b) => b.weight - a.weight).slice(0, 5),
        missing: missing.sort((a, b) => b.weight - a.weight).slice(0, 5),
        preferenceSignals,
    };
};
exports.scoreJobFit = scoreJobFit;
