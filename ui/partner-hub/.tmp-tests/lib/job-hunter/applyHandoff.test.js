"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const applyHandoff_1 = require("./applyHandoff");
const applyPacket_1 = require("./applyPacket");
const tailor_1 = require("./resume/tailor");
const profile = {
    fullName: "James Wang",
    email: "james@example.com",
    phone: "555-0101",
    cityState: "Austin, TX",
    linkedinUrl: "https://linkedin.com/in/james",
    websiteUrl: "",
    workAuthorizationNote: "US Citizen",
    signatureLine: "Best regards,",
    headline: "Staff Engineer",
    summary: "Built enterprise cloud solutions.",
    skills: ["AWS", "Architecture"],
    experience: [{ company: "Example", title: "Architect", bullets: ["Led platform modernization"] }],
    achievements: ["Scaled migration program"],
};
const buildJob = (sourceProvider) => ({
    id: `job-${sourceProvider ?? "generic"}`,
    title: "Senior Solutions Architect",
    company: "Acme Cloud",
    sourceProvider,
    source: "company-site",
    sourceUrl: "https://acme.example/jobs/1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
});
(0, node_test_1.describe)("buildApplyHandoffPlan", () => {
    (0, node_test_1.it)("builds deterministic plans for supported providers", () => {
        const providers = ["greenhouse", "lever", "ashby", "smartrecruiters"];
        providers.forEach((provider) => {
            const job = buildJob(provider);
            const tailoringPacket = (0, tailor_1.generateTailoringPacket)(job, profile);
            const packet = (0, applyPacket_1.buildApplyPacket)(job, tailoringPacket, profile);
            const prepItems = (0, applyPacket_1.buildApplyPrepItems)(job, packet, tailoringPacket, profile);
            const handoff = (0, applyHandoff_1.buildApplyHandoffPlan)(job, prepItems);
            assert.equal(handoff.provider, provider);
            assert.ok(handoff.providerLabel.length > 0);
            assert.ok(handoff.likelySteps.length >= 3);
            assert.ok(handoff.groupedPrepItems[0]?.group === "upload");
            assert.ok(handoff.groupedPrepItems[0]?.items.every((item) => item.actionType === "download"));
            assert.ok(handoff.recommendedArtifacts.length >= 2);
            assert.ok(handoff.groupedPrepItems.some((group) => group.items.some((item) => item.actionType === "open-link")));
        });
    });
    (0, node_test_1.it)("preserves generic behavior when provider data is missing", () => {
        const job = buildJob(undefined);
        const tailoringPacket = (0, tailor_1.generateTailoringPacket)(job, profile);
        const packet = (0, applyPacket_1.buildApplyPacket)(job, tailoringPacket, profile);
        const prepItems = (0, applyPacket_1.buildApplyPrepItems)(job, packet, tailoringPacket, profile);
        const handoff = (0, applyHandoff_1.buildApplyHandoffPlan)(job, prepItems);
        assert.equal(handoff.provider, "generic");
        assert.equal(handoff.providerLabel, "Generic application portal");
        assert.ok(handoff.likelySteps.some((step) => step.includes("Open external application")));
    });
});
(0, node_test_1.describe)("buildApplyReadinessSummary", () => {
    (0, node_test_1.it)("returns all-ready when key fields are present", () => {
        const job = buildJob("lever");
        const tailoringPacket = (0, tailor_1.generateTailoringPacket)(job, profile);
        const packet = (0, applyPacket_1.buildApplyPacket)(job, tailoringPacket, profile);
        const prepItems = (0, applyPacket_1.buildApplyPrepItems)(job, packet, tailoringPacket, profile);
        const readiness = (0, applyHandoff_1.buildApplyReadinessSummary)(job, prepItems, {
            selectedForApply: true,
            tailoredResumeReady: true,
            coverLetterReady: true,
            screenerAnswersReady: true,
            externalApplicationOpened: false,
            tailoredResumeUploaded: false,
            customQuestionsCompleted: false,
            finalExternalSubmitConfirmed: false,
            followUpScheduled: false,
        });
        assert.equal(readiness.resumeReady, true);
        assert.equal(readiness.coverLetterReady, true);
        assert.equal(readiness.candidateProfileReady, true);
        assert.equal(readiness.providerHandoffReady, true);
    });
    (0, node_test_1.it)("requires upload-ready artifacts for resume/cover-letter readiness", () => {
        const job = buildJob("greenhouse");
        const tailoringPacket = (0, tailor_1.generateTailoringPacket)(job, profile);
        const packet = (0, applyPacket_1.buildApplyPacket)(job, tailoringPacket, profile);
        const prepItems = (0, applyPacket_1.buildApplyPrepItems)(job, packet, tailoringPacket, profile).map((item) => {
            if (item.key === "tailoredResumeDocx" || item.key === "coverLetterDocx") {
                return { ...item, value: "" };
            }
            return item;
        });
        const readiness = (0, applyHandoff_1.buildApplyReadinessSummary)(job, prepItems);
        assert.equal(readiness.resumeReady, false);
        assert.equal(readiness.coverLetterReady, false);
        assert.equal(readiness.providerHandoffReady, false);
    });
    (0, node_test_1.it)("flags not-ready when placeholders remain", () => {
        const job = buildJob("ashby");
        const tailoringPacket = (0, tailor_1.generateTailoringPacket)(job, { ...profile, linkedinUrl: "", workAuthorizationNote: "" });
        const packet = (0, applyPacket_1.buildApplyPacket)(job, tailoringPacket, { ...profile, linkedinUrl: "", workAuthorizationNote: "" });
        const prepItems = (0, applyPacket_1.buildApplyPrepItems)(job, packet, tailoringPacket, { ...profile, linkedinUrl: "", workAuthorizationNote: "" });
        const readiness = (0, applyHandoff_1.buildApplyReadinessSummary)(job, prepItems);
        assert.equal(readiness.candidateProfileReady, false);
        assert.equal(readiness.providerHandoffReady, true);
    });
});
