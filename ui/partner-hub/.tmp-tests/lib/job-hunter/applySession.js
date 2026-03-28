"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toApplySessionJson = exports.buildApplySessionPayload = void 0;
const docExports_1 = require("./docExports");
const splitName = (fullName) => {
    const compact = fullName.trim().replace(/\s+/g, " ");
    const [firstName = "", ...rest] = compact.split(" ");
    return {
        firstName,
        lastName: rest.join(" "),
    };
};
const buildApplySessionPayload = (job, tailoringPacket, applyPacket, profile) => {
    const fullName = profile?.fullName?.trim() ?? "";
    const nameParts = splitName(fullName);
    return {
        version: "1",
        sessionId: `apply-session-${job.id}`,
        jobId: job.id,
        provider: job.sourceProvider ?? "unknown",
        sourceUrl: job.sourceUrl ?? "",
        candidate: {
            fullName,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            email: profile?.email?.trim() ?? "",
            phone: profile?.phone?.trim() ?? "",
            cityState: profile?.cityState?.trim() ?? "",
            linkedinUrl: profile?.linkedinUrl?.trim() ?? "",
            websiteUrl: profile?.websiteUrl?.trim() ?? "",
            workAuthorizationNote: profile?.workAuthorizationNote?.trim() ?? "",
        },
        tailored: {
            headline: tailoringPacket.tailoredResumeVariant.tailoredHeadline,
            summary: tailoringPacket.tailoredSummary,
            coverLetterText: applyPacket.coverLetterMarkdown,
            screenerAnswers: tailoringPacket.screenerAnswers,
        },
        artifacts: {
            tailoredResumeDocxFileName: (0, docExports_1.buildAtsArtifactFileName)(fullName || "candidate", job.company, job.title, "resume"),
            coverLetterDocxFileName: (0, docExports_1.buildAtsArtifactFileName)(fullName || "candidate", job.company, job.title, "cover-letter"),
            applyPacketFileName: `${applyPacket.fileBaseName}.md`,
        },
    };
};
exports.buildApplySessionPayload = buildApplySessionPayload;
const toApplySessionJson = (payload) => `${JSON.stringify(payload, null, 2)}\n`;
exports.toApplySessionJson = toApplySessionJson;
