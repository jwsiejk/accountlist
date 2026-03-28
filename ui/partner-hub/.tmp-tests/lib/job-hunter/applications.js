"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportApplicationsCsv = exports.applicationReducer = exports.resolveApplicationJobDetails = exports.syncWorkflowSelectionWithQueue = exports.shouldShowInApplicationsPipeline = exports.shouldPreserveWorkflowSelection = exports.getApplicationQueueStage = exports.getApplicationWorkflow = exports.getApplicationChecklist = exports.createApplicationFromJob = exports.toJobSnapshot = exports.buildAnswerPack = exports.buildFollowUpEmail = exports.DEFAULT_GUIDED_APPLY_WORKFLOW = exports.DEFAULT_APPLY_CHECKLIST = exports.STATUS_LABELS = exports.APPLICATION_STATUSES = void 0;
exports.APPLICATION_STATUSES = ["prepared", "applied", "interview", "rejected", "offer"];
exports.STATUS_LABELS = {
    prepared: "Prepared",
    applied: "Applied",
    interview: "Interview",
    rejected: "Rejected",
    offer: "Offer",
};
exports.DEFAULT_APPLY_CHECKLIST = {
    resumeReviewed: false,
    coverLetterReviewed: false,
    screenerAnswersReviewed: false,
    appliedExternally: false,
    followUpScheduled: false,
};
exports.DEFAULT_GUIDED_APPLY_WORKFLOW = {
    selectedForApply: false,
    tailoredResumeReady: false,
    coverLetterReady: false,
    screenerAnswersReady: false,
    externalApplicationOpened: false,
    tailoredResumeUploaded: false,
    customQuestionsCompleted: false,
    finalExternalSubmitConfirmed: false,
    followUpScheduled: false,
};
const buildFollowUpEmail = (job, profile) => {
    const signatureLine = profile?.signatureLine?.trim() || "Best regards,";
    const signerName = profile?.fullName?.trim() || "Candidate";
    return `Hi ${job.company} recruiting team,\n\nI applied for the ${job.title} role and wanted to follow up on next steps. I remain very interested in the position and would be happy to share any additional information.\n\n${signatureLine}\n${signerName}`;
};
exports.buildFollowUpEmail = buildFollowUpEmail;
const buildAnswerPack = (job) => {
    return [
        `Role: ${job.title} at ${job.company}`,
        `Link: ${job.sourceUrl ?? "Add job posting URL"}`,
        "Why this role: I can contribute quickly with directly relevant experience in this area.",
        "Strengths: execution ownership, stakeholder communication, measurable impact.",
        "Compensation: open to a market-competitive package based on scope and level.",
        "Availability: can interview this week and start after notice requirements.",
    ].join("\n");
};
exports.buildAnswerPack = buildAnswerPack;
const statusTimestampPatch = (status, now) => {
    if (status === "applied")
        return { appliedAt: now };
    if (status === "interview")
        return { interviewedAt: now };
    if (status === "rejected")
        return { rejectedAt: now };
    if (status === "offer")
        return { offeredAt: now };
    return {};
};
const toJobSnapshot = (job) => ({
    jobId: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    sourceUrl: job.sourceUrl,
    department: job.department,
    postedAt: job.postedAt,
});
exports.toJobSnapshot = toJobSnapshot;
const createApplicationFromJob = (job, now) => ({
    id: job.id,
    jobId: job.id,
    status: "prepared",
    checklist: { ...exports.DEFAULT_APPLY_CHECKLIST },
    workflow: { ...exports.DEFAULT_GUIDED_APPLY_WORKFLOW },
    createdAt: now,
    updatedAt: now,
});
exports.createApplicationFromJob = createApplicationFromJob;
const getApplicationChecklist = (application) => ({
    ...exports.DEFAULT_APPLY_CHECKLIST,
    ...(application.checklist ?? {}),
});
exports.getApplicationChecklist = getApplicationChecklist;
const getApplicationWorkflow = (application) => {
    const checklist = (0, exports.getApplicationChecklist)(application);
    const workflow = {
        ...exports.DEFAULT_GUIDED_APPLY_WORKFLOW,
        ...(application.workflow ?? {}),
    };
    return {
        ...workflow,
        tailoredResumeReady: workflow.tailoredResumeReady || checklist.resumeReviewed,
        coverLetterReady: workflow.coverLetterReady || checklist.coverLetterReviewed,
        screenerAnswersReady: workflow.screenerAnswersReady || checklist.screenerAnswersReviewed,
        finalExternalSubmitConfirmed: workflow.finalExternalSubmitConfirmed || checklist.appliedExternally,
        followUpScheduled: workflow.followUpScheduled || checklist.followUpScheduled,
    };
};
exports.getApplicationWorkflow = getApplicationWorkflow;
const getApplicationQueueStage = (application) => {
    if (application.status === "applied" || application.status === "interview" || application.status === "offer" || application.status === "rejected") {
        return "applied";
    }
    const workflow = (0, exports.getApplicationWorkflow)(application);
    if (!workflow.selectedForApply) {
        return "untracked";
    }
    if (workflow.tailoredResumeReady &&
        workflow.coverLetterReady &&
        workflow.screenerAnswersReady &&
        !workflow.externalApplicationOpened) {
        return "prepared";
    }
    if (workflow.externalApplicationOpened || workflow.tailoredResumeUploaded || workflow.customQuestionsCompleted) {
        return "in-progress";
    }
    return "selected";
};
exports.getApplicationQueueStage = getApplicationQueueStage;
const hasInProgressWorkflowSignals = (workflow) => workflow.externalApplicationOpened ||
    workflow.tailoredResumeUploaded ||
    workflow.customQuestionsCompleted ||
    workflow.finalExternalSubmitConfirmed;
const shouldPreserveWorkflowSelection = (application) => {
    if (application.status === "applied" || application.status === "interview" || application.status === "offer" || application.status === "rejected") {
        return true;
    }
    return hasInProgressWorkflowSignals((0, exports.getApplicationWorkflow)(application));
};
exports.shouldPreserveWorkflowSelection = shouldPreserveWorkflowSelection;
const shouldShowInApplicationsPipeline = (application) => {
    if (application.status === "applied" || application.status === "interview" || application.status === "offer" || application.status === "rejected") {
        return true;
    }
    const workflow = (0, exports.getApplicationWorkflow)(application);
    return workflow.selectedForApply || hasInProgressWorkflowSignals(workflow);
};
exports.shouldShowInApplicationsPipeline = shouldShowInApplicationsPipeline;
const syncWorkflowSelectionWithQueue = (applicationsById, selectedJobIds, now) => {
    const selectedSet = new Set(selectedJobIds);
    let next = applicationsById;
    Object.values(applicationsById).forEach((application) => {
        const workflow = (0, exports.getApplicationWorkflow)(application);
        const inQueue = selectedSet.has(application.jobId);
        const desiredSelectedForApply = inQueue || (!inQueue && workflow.selectedForApply && (0, exports.shouldPreserveWorkflowSelection)(application));
        if (desiredSelectedForApply === workflow.selectedForApply) {
            return;
        }
        next = (0, exports.applicationReducer)(next, {
            type: "setWorkflowItem",
            jobId: application.jobId,
            item: "selectedForApply",
            value: desiredSelectedForApply,
            now,
        });
    });
    return next;
};
exports.syncWorkflowSelectionWithQueue = syncWorkflowSelectionWithQueue;
const resolveApplicationJobDetails = (application, jobsById) => {
    const liveJob = jobsById[application.jobId];
    if (liveJob) {
        return {
            missingLiveJob: false,
            title: liveJob.title,
            company: liveJob.company,
            location: liveJob.location,
            sourceUrl: liveJob.sourceUrl,
            department: liveJob.department,
            postedAt: liveJob.postedAt,
        };
    }
    const snapshot = application.jobSnapshot;
    return {
        missingLiveJob: true,
        title: snapshot?.title ?? "Unknown role",
        company: snapshot?.company ?? "Unknown company",
        location: snapshot?.location,
        sourceUrl: snapshot?.sourceUrl,
        department: snapshot?.department,
        postedAt: snapshot?.postedAt,
    };
};
exports.resolveApplicationJobDetails = resolveApplicationJobDetails;
const applicationReducer = (state, action) => {
    const now = action.now ?? new Date().toISOString();
    if (action.type === "upsertFromJob") {
        const existing = state[action.job.id];
        if (existing) {
            return state;
        }
        return {
            ...state,
            [action.job.id]: (0, exports.createApplicationFromJob)(action.job, now),
        };
    }
    const existing = state[action.jobId];
    if (!existing) {
        return state;
    }
    if (action.type === "setStatus") {
        const next = {
            ...existing,
            status: action.status,
            updatedAt: now,
            ...statusTimestampPatch(action.status, now),
            checklist: (0, exports.getApplicationChecklist)(existing),
            workflow: {
                ...(0, exports.getApplicationWorkflow)(existing),
                finalExternalSubmitConfirmed: action.status === "applied" ? true : (0, exports.getApplicationWorkflow)(existing).finalExternalSubmitConfirmed,
            },
        };
        return {
            ...state,
            [action.jobId]: next,
        };
    }
    if (action.type === "setReminder") {
        return {
            ...state,
            [action.jobId]: {
                ...existing,
                reminderAt: action.reminderAt,
                checklist: (0, exports.getApplicationChecklist)(existing),
                workflow: (0, exports.getApplicationWorkflow)(existing),
                updatedAt: now,
            },
        };
    }
    if (action.type === "setNotes") {
        return {
            ...state,
            [action.jobId]: {
                ...existing,
                notes: action.notes,
                checklist: (0, exports.getApplicationChecklist)(existing),
                workflow: (0, exports.getApplicationWorkflow)(existing),
                updatedAt: now,
            },
        };
    }
    if (action.type === "setChecklistItem") {
        return {
            ...state,
            [action.jobId]: {
                ...existing,
                checklist: {
                    ...(0, exports.getApplicationChecklist)(existing),
                    [action.item]: action.value,
                },
                workflow: {
                    ...(0, exports.getApplicationWorkflow)(existing),
                    ...(action.item === "resumeReviewed" ? { tailoredResumeReady: action.value } : {}),
                    ...(action.item === "coverLetterReviewed" ? { coverLetterReady: action.value } : {}),
                    ...(action.item === "screenerAnswersReviewed" ? { screenerAnswersReady: action.value } : {}),
                    ...(action.item === "appliedExternally" ? { finalExternalSubmitConfirmed: action.value } : {}),
                    ...(action.item === "followUpScheduled" ? { followUpScheduled: action.value } : {}),
                },
                updatedAt: now,
            },
        };
    }
    if (action.type === "setWorkflowItem") {
        return {
            ...state,
            [action.jobId]: {
                ...existing,
                checklist: {
                    ...(0, exports.getApplicationChecklist)(existing),
                    ...(action.item === "tailoredResumeReady" ? { resumeReviewed: action.value } : {}),
                    ...(action.item === "coverLetterReady" ? { coverLetterReviewed: action.value } : {}),
                    ...(action.item === "screenerAnswersReady" ? { screenerAnswersReviewed: action.value } : {}),
                    ...(action.item === "finalExternalSubmitConfirmed" ? { appliedExternally: action.value } : {}),
                    ...(action.item === "followUpScheduled" ? { followUpScheduled: action.value } : {}),
                },
                workflow: {
                    ...(0, exports.getApplicationWorkflow)(existing),
                    [action.item]: action.value,
                },
                updatedAt: now,
            },
        };
    }
    if (action.type === "ensureSnapshotFromJob") {
        if (existing.jobSnapshot) {
            return state;
        }
        return {
            ...state,
            [action.jobId]: {
                ...existing,
                checklist: (0, exports.getApplicationChecklist)(existing),
                workflow: (0, exports.getApplicationWorkflow)(existing),
                jobSnapshot: (0, exports.toJobSnapshot)(action.job),
                updatedAt: now,
            },
        };
    }
    return state;
};
exports.applicationReducer = applicationReducer;
const exportApplicationsCsv = (applications, jobsById) => {
    const escape = (value) => `"${value.replace(/"/g, '""')}"`;
    const header = [
        "jobId",
        "company",
        "title",
        "status",
        "notes",
        "createdAt",
        "appliedAt",
        "interviewedAt",
        "offeredAt",
        "rejectedAt",
        "reminderAt",
        "updatedAt",
    ];
    const rows = applications.map((application) => {
        const jobDetails = (0, exports.resolveApplicationJobDetails)(application, jobsById);
        return [
            application.jobId,
            jobDetails.company,
            jobDetails.title,
            application.status,
            application.notes ?? "",
            application.createdAt,
            application.appliedAt ?? "",
            application.interviewedAt ?? "",
            application.offeredAt ?? "",
            application.rejectedAt ?? "",
            application.reminderAt ?? "",
            application.updatedAt,
        ]
            .map((value) => escape(value))
            .join(",");
    });
    return [header.map((value) => escape(value)).join(","), ...rows].join("\n");
};
exports.exportApplicationsCsv = exportApplicationsCsv;
