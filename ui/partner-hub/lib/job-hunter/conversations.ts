import type { ConversationBrief, ConversationTarget, JobPosting, OutreachChannel, OutreachSequence, OutreachStage } from "./types";

const BANLIST = ["i am extremely passionate", "synergize", "circle back", "rockstar", "guru"];

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const iso = (d: Date) => d.toISOString();

export const normalizeConversationTarget = (target: ConversationTarget): ConversationTarget => ({
  ...target,
  company: clean(target.company),
  fullName: target.fullName ? clean(target.fullName) : undefined,
  roleTitle: target.roleTitle ? clean(target.roleTitle) : undefined,
  email: target.email ? clean(target.email) : undefined,
  linkedinUrl: target.linkedinUrl ? clean(target.linkedinUrl) : undefined,
  confidence: Math.max(0, Math.min(100, Number.isFinite(target.confidence) ? target.confidence : 0)),
});

export const normalizeConversationBrief = (brief: ConversationBrief): ConversationBrief => ({
  ...brief,
  reasonToPursue: clean(brief.reasonToPursue),
  hiringPriorities: brief.hiringPriorities.map(clean).filter(Boolean),
  painPoints: brief.painPoints.map(clean).filter(Boolean),
  candidateFit: brief.candidateFit.map(clean).filter(Boolean),
  riskAreas: brief.riskAreas.map(clean).filter(Boolean),
  messageAngle: clean(brief.messageAngle),
  targetIds: Array.from(new Set(brief.targetIds.filter(Boolean))),
});

export const normalizeOutreachSequence = (sequence: OutreachSequence): OutreachSequence => ({
  ...sequence,
  subject: clean(sequence.subject),
  message: clean(sequence.message),
});

export const buildConversationBriefForJob = (job: JobPosting, now: Date): { brief: ConversationBrief; targets: ConversationTarget[] } => {
  const baseId = `${job.id}:${job.company.toLowerCase().replace(/\W+/g, "-")}`;
  const recruiterId = `${baseId}:recruiter`;
  const hiringManagerId = `${baseId}:hiring_manager`;
  const reasonToPursue = `${job.title} at ${job.company} aligns with direct impact and ownership in ${job.department ?? "the team"}.`;
  const priorities = [job.title, job.department ?? "cross-functional collaboration", job.isRemote ? "distributed execution" : "on-site coordination"];
  const painPoints = ["Need faster onboarding", "Need predictable delivery", "Need clearer stakeholder communication"];
  const candidateFit = ["Relevant domain experience", "Hands-on execution", "Strong partner communication"];
  const riskAreas = [job.location ? `Location alignment: ${job.location}` : "Location unknown", job.salaryRange ? `Comp band fit: ${job.salaryRange}` : "Comp band unclear"];
  const messageAngle = `Lead with outcomes, tie experience to ${job.title} priorities, and ask for a short conversation.`;
  const createdAt = iso(now);
  const targets: ConversationTarget[] = [
    normalizeConversationTarget({ id: recruiterId, jobId: job.id, company: job.company, relationship: "recruiter", confidence: 70, createdAt, updatedAt: createdAt }),
    normalizeConversationTarget({ id: hiringManagerId, jobId: job.id, company: job.company, relationship: "hiring_manager", confidence: 65, createdAt, updatedAt: createdAt }),
  ];
  const brief: ConversationBrief = normalizeConversationBrief({
    id: `${baseId}:brief`,
    jobId: job.id,
    company: job.company,
    reasonToPursue,
    hiringPriorities: priorities,
    painPoints,
    candidateFit,
    riskAreas,
    messageAngle,
    targetIds: targets.map((t) => t.id),
    createdAt,
    updatedAt: createdAt,
  });
  return { brief, targets };
};

export const buildOutreachDraft = (params: { job: JobPosting; brief: ConversationBrief; target: ConversationTarget; channel: OutreachChannel; stage: OutreachStage; now: Date }): OutreachSequence => {
  const helloName = params.target.fullName?.split(" ")[0] ?? `${params.job.company} team`;
  const subject = params.stage === "intro" ? `${params.job.title} conversation` : `Follow-up on ${params.job.title}`;
  const maxLen = params.channel === "linkedin" ? 600 : 1200;
  let message = `Hi ${helloName}, I saw the ${params.job.title} opening at ${params.job.company}. ${params.brief.messageAngle} If helpful, I can share relevant examples and would value 15 minutes. Thanks.`;
  if (message.length > maxLen) {
    message = `${message.slice(0, maxLen - 3)}...`;
  }
  for (const phrase of BANLIST) {
    const re = new RegExp(phrase, "ig");
    message = message.replace(re, "");
  }
  const id = `${params.job.id}:${params.target.id}:${params.stage}:${params.channel}`;
  const t = iso(params.now);
  return normalizeOutreachSequence({
    id,
    jobId: params.job.id,
    targetId: params.target.id,
    briefId: params.brief.id,
    stage: params.stage,
    status: "draft",
    channel: params.channel,
    scheduledFor: t,
    subject,
    message,
    createdAt: t,
    updatedAt: t,
  });
};

export const buildInitialOutreachQueueForJob = (params: { job: JobPosting; brief: ConversationBrief; targets: ConversationTarget[]; existing: OutreachSequence[]; now: Date }): OutreachSequence[] => {
  const priority = { recruiter: 0, hiring_manager: 1, peer: 2, referral_contact: 3 };
  const sorted = [...params.targets].filter((t) => t.company === params.job.company).sort((a, b) => priority[a.relationship] - priority[b.relationship]);
  const seen = new Set(params.existing.map((s) => `${s.jobId}:${s.targetId}:${s.stage}`));
  const out: OutreachSequence[] = [];
  for (const target of sorted) {
    const key = `${params.job.id}:${target.id}:intro`;
    if (seen.has(key)) continue;
    const channel: OutreachChannel = target.linkedinUrl ? "linkedin" : "email";
    out.push(buildOutreachDraft({ job: params.job, brief: params.brief, target, channel, stage: "intro", now: params.now }));
    seen.add(key);
  }
  return out;
};

export const isBusinessDay = (date: Date) => ![0, 6].includes(date.getUTCDay());
export const addBusinessDays = (start: Date, days: number): Date => {
  const d = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusinessDay(d)) remaining -= 1;
  }
  return d;
};

export const scheduleNextFollowUp = (sequence: OutreachSequence, now: Date): OutreachSequence | null => {
  if (sequence.stage === "follow_up_2") return null;
  const nextStage: OutreachStage = sequence.stage === "intro" ? "follow_up_1" : "follow_up_2";
  const offset = sequence.stage === "intro" ? 2 : 4;
  const scheduledFor = iso(addBusinessDays(new Date(now), offset));
  return { ...sequence, id: `${sequence.jobId}:${sequence.targetId}:${nextStage}:${sequence.channel}`, stage: nextStage, status: "draft", scheduledFor, sentAt: undefined, repliedAt: undefined, updatedAt: iso(now) };
};

export const getTodaysConversationActions = (params: { today: Date; sequences: OutreachSequence[]; targets: ConversationTarget[]; jobs: JobPosting[] }) => {
  const todayIso = params.today.toISOString().slice(0, 10);
  const draftsToReview = params.sequences.filter((s) => s.status === "draft");
  const followUpsDue = params.sequences.filter((s) => s.stage !== "intro" && s.status === "draft" && s.scheduledFor.slice(0, 10) <= todayIso);
  const staleSentNoReply = params.sequences.filter((s) => s.status === "sent" && !s.repliedAt && (params.today.getTime() - new Date(s.sentAt ?? s.updatedAt).getTime()) / 86400000 > 5);
  const activeReplies = params.sequences.filter((s) => s.status === "replied");
  const jobsWithTargets = new Set(params.targets.map((t) => t.jobId));
  const rolesNeedingTargets = params.jobs.filter((j) => !jobsWithTargets.has(j.id));
  return { draftsToReview, followUpsDue, staleSentNoReply, activeReplies, rolesNeedingTargets };
};
