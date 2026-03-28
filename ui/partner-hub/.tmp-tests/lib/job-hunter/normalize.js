"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeJobPosting = void 0;
const textCleanup_1 = require("./textCleanup");
const MAX_NOTES_LENGTH = 1200;
const collapse = (value) => value.trim().replace(/\s+/g, " ");
const sanitizeText = (value, maxLength) => {
    const cleaned = (0, textCleanup_1.cleanInlineSourceText)(value, maxLength);
    if (!cleaned) {
        return undefined;
    }
    return maxLength ? collapse(cleaned) : cleaned;
};
const normalizeLocation = (location) => {
    if (!location) {
        return "Remote / TBD";
    }
    const compact = collapse(location);
    if (/remote/i.test(compact)) {
        return "Remote";
    }
    return compact;
};
const toIsoIfValid = (value) => {
    if (!value) {
        return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    return date.toISOString();
};
const stableJobId = (source, externalId) => {
    const normalizedExternal = String(externalId).trim().toLowerCase();
    return `${source}:${normalizedExternal}`;
};
const normalizeJobPosting = (input) => {
    const timestamp = new Date().toISOString();
    const id = stableJobId(input.source, input.externalId);
    const postedAt = toIsoIfValid(input.postedAt);
    return {
        id,
        externalId: String(input.externalId),
        title: collapse(input.title),
        company: collapse(input.company),
        location: normalizeLocation(input.location),
        department: input.department ? collapse(input.department) : undefined,
        salaryRange: sanitizeText(input.salaryRange, 120),
        employmentType: sanitizeText(input.employmentType, 80),
        sourceProvider: input.source,
        source: "company-site",
        sourceUrl: collapse(input.url),
        postedAt,
        isRemote: /remote/i.test(input.location ?? ""),
        notes: sanitizeText(input.notes, MAX_NOTES_LENGTH),
        createdAt: postedAt ?? timestamp,
        updatedAt: timestamp,
    };
};
exports.normalizeJobPosting = normalizeJobPosting;
