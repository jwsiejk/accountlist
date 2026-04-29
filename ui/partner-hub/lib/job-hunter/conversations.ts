import type { ConversationBrief, ConversationTarget, JobPosting, OutreachChannel, OutreachSequence, OutreachStage, ResumeProfile } from "./types";

const BANLIST = ["i am extremely passionate", "synergize", "circle back", "rockstar", "guru"];
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const iso = (d: Date) => d.toISOString();
export const normalizeCompanyKey = (company: string) => clean(company).toLowerCase();

export const normalizeConversationTarget = (target: ConversationTarget): ConversationTarget => ({
  ...target,
  company: clean(target.company),
  name: clean(target.name),
  title: target.title ? clean(target.title) : undefined,
  email: target.email ? clean(target.email) : undefined,
  profileUrl: target.profileUrl ? clean(target.profileUrl) : undefined,
  confidence: Math.max(0, Math.min(100, Number.isFinite(target.confidence) ? target.confidence : 0)),
});

export const normalizeConversationBrief = (brief: ConversationBrief): ConversationBrief => ({
  ...brief,
  reasonToPursue: clean(brief.reasonToPursue),
  likelyHiringPriorities: brief.likelyHiringPriorities.map(clean).filter(Boolean),
  likelyPainPoints: brief.likelyPainPoints.map(clean).filter(Boolean),
  candidateFit: brief.candidateFit.map(clean).filter(Boolean),
  riskAreas: brief.riskAreas.map(clean).filter(Boolean),
  messageAngle: clean(brief.messageAngle),
  proofPoints: brief.proofPoints.map(clean).filter(Boolean),
  recommendedTargets: Array.from(new Set(brief.recommendedTargets.filter(Boolean))),
});

export const normalizeOutreachSequence = (sequence: OutreachSequence): OutreachSequence => ({
  ...sequence,
  generatedMessage: clean(sequence.generatedMessage),
  editedMessage: sequence.editedMessage ? clean(sequence.editedMessage) : undefined,
});

export const buildConversationBriefForJob = (job: JobPosting, fit?: { matched?: string[]; missing?: string[]; preferenceSignals?: string[] }, resumeProfile?: ResumeProfile, now = new Date()): { brief: ConversationBrief; targets: ConversationTarget[] } => {
  const baseId = `${job.id}:${job.company.toLowerCase().replace(/\W+/g, "-")}`;
  const createdAt = iso(now);
  const targets: ConversationTarget[] = [
    normalizeConversationTarget({ id: `${baseId}:recruiter`, company: job.company, name: `${job.company} Recruiter`, relationshipType: "recruiter", source: "manual", confidence: 70, createdAt, updatedAt: createdAt }),
    normalizeConversationTarget({ id: `${baseId}:hiring_manager`, company: job.company, name: `${job.company} Hiring Manager`, relationshipType: "hiring_manager", source: "manual", confidence: 65, createdAt, updatedAt: createdAt }),
  ];
  const brief: ConversationBrief = normalizeConversationBrief({
    id: `${baseId}:brief`,
    jobId: job.id,
    company: job.company,
    roleTitle: job.title,
    reasonToPursue: `${job.title} at ${job.company} aligns with direct impact and ownership in ${job.department ?? "the team"}.`,
    likelyHiringPriorities: fit?.matched?.length ? fit.matched : [job.title, job.department ?? "cross-functional collaboration"],
    likelyPainPoints: fit?.missing?.length ? fit.missing : ["Need faster onboarding", "Need predictable delivery"],
    candidateFit: fit?.matched?.length ? fit.matched : ["Relevant domain experience", "Hands-on execution"],
    riskAreas: fit?.missing?.length ? fit.missing : [job.location ? `Location alignment: ${job.location}` : "Location unknown"],
    messageAngle: `Lead with outcomes, tie experience to ${job.title} priorities, and ask for a short conversation.`,
    proofPoints: fit?.preferenceSignals?.length ? fit.preferenceSignals : resumeProfile?.achievements?.slice(0, 3) ?? [],
    recommendedTargets: targets.map((t) => t.id),
    createdAt,
    updatedAt: createdAt,
  });
  return { brief, targets };
};

export const buildOutreachDraft = (params: { job: JobPosting; brief: ConversationBrief; target: ConversationTarget; channel: OutreachChannel; stage: OutreachStage; now: Date }): OutreachSequence => {
  const helloName = params.target.name.split(" ")[0] ?? `${params.job.company} team`;
  const maxLen = params.channel === "linkedin" ? 600 : 1200;
  let message = `Hi ${helloName}, I saw the ${params.job.title} opening at ${params.job.company}. ${params.brief.messageAngle} If helpful, I can share relevant examples and would value 15 minutes. Thanks.`;
  if (message.length > maxLen) message = `${message.slice(0, maxLen - 3)}...`;
  for (const phrase of BANLIST) message = message.replace(new RegExp(phrase, "ig"), "");
  const t = iso(params.now);
  return normalizeOutreachSequence({ id: `${params.job.id}:${params.target.id}:${params.stage}:${params.channel}`, jobId: params.job.id, contactId: params.target.id, stage: params.stage, channel: params.channel, generatedMessage: message, status: "draft", dueAt: t, createdAt: t, updatedAt: t });
};

export const buildInitialOutreachQueueForJob = (params: { job: JobPosting; brief: ConversationBrief; targets: ConversationTarget[]; existing: OutreachSequence[]; now: Date }): OutreachSequence[] => {
  const priority = { recruiter: 0, hiring_manager: 1, employee: 2, referral: 3, unknown: 4 };
  const jobCompanyKey = normalizeCompanyKey(params.job.company);
  const sorted = [...params.targets]
    .filter((t) => normalizeCompanyKey(t.company) === jobCompanyKey)
    .sort((a, b) => priority[a.relationshipType] - priority[b.relationshipType]);
  const seen = new Set(params.existing.map((s) => `${s.jobId}:${s.contactId}:${s.stage}:${s.channel}`));
  const out: OutreachSequence[] = [];
  for (const target of sorted) {
    const channel: OutreachChannel = target.profileUrl ? "linkedin" : target.email ? "email" : "manual";
    const key = `${params.job.id}:${target.id}:intro:${channel}`;
    if (seen.has(key)) continue;
    out.push(buildOutreachDraft({ job: params.job, brief: params.brief, target, channel, stage: "intro", now: params.now }));
    seen.add(key);
  }
  return out;
};

export const isBusinessDay = (date: Date) => ![0, 6].includes(date.getUTCDay());
export const addBusinessDays = (start: Date, days: number): Date => { const d = new Date(start); let r = days; while (r > 0) { d.setUTCDate(d.getUTCDate() + 1); if (isBusinessDay(d)) r -= 1; } return d; };
export const scheduleNextFollowUp = (sequence: OutreachSequence, now: Date): OutreachSequence | null => {
  if (sequence.stage === "follow_up_2") return null;
  const nextStage: OutreachStage = sequence.stage === "intro" ? "follow_up_1" : "follow_up_2";
  return { ...sequence, id: `${sequence.jobId}:${sequence.contactId}:${nextStage}:${sequence.channel}`, stage: nextStage, status: "draft", dueAt: iso(addBusinessDays(now, sequence.stage === "intro" ? 2 : 4)), sentAt: undefined, repliedAt: undefined, updatedAt: iso(now) };
};

export const getTodaysConversationActions = (params: { today: Date; sequences: OutreachSequence[]; targets: ConversationTarget[]; jobs: JobPosting[] }) => {
  const todayIso = params.today.toISOString().slice(0, 10);
  const draftsToReview = params.sequences.filter((s) => s.status === "draft" || s.status === "queued");
  const followUpsDue = params.sequences.filter((s) => s.stage !== "intro" && (s.status === "draft" || s.status === "queued") && (s.dueAt?.slice(0, 10) ?? "") <= todayIso);
  const staleSentNoReply = params.sequences.filter((s) => s.status === "sent" && !s.repliedAt && (params.today.getTime() - new Date(s.sentAt ?? s.updatedAt).getTime()) / 86400000 > 5);
  const activeReplies = params.sequences.filter((s) => s.status === "replied");
  const companiesWithTargets = new Set(params.targets.map((t) => normalizeCompanyKey(t.company)));
  const rolesNeedingTargets = params.jobs.filter((j) => !companiesWithTargets.has(normalizeCompanyKey(j.company)));
  return { draftsToReview, followUpsDue, staleSentNoReply, activeReplies, rolesNeedingTargets };
};
