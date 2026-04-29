import type { ApplicationJobSnapshot, JobPosting, JobHunterConversationDraft, JobHunterConversationMessage, JobHunterConversationThread, JobHunterConversationType } from "./types";

const nowIso = (now: Date) => now.toISOString();

export const createConversationThreadId = (jobId: string, type: JobHunterConversationType) => `${jobId}:${type}`;

export const createConversationThread = (params: {
  jobId: string;
  type: JobHunterConversationType;
  now: Date;
  title?: string;
}): JobHunterConversationThread => ({
  id: createConversationThreadId(params.jobId, params.type),
  jobId: params.jobId,
  type: params.type,
  title: params.title,
  messages: [],
  createdAt: nowIso(params.now),
  updatedAt: nowIso(params.now),
});

export const appendConversationMessage = (thread: JobHunterConversationThread, message: Omit<JobHunterConversationMessage, "id"> & { id?: string }): JobHunterConversationThread => {
  const id = message.id ?? `${thread.id}:m-${thread.messages.length + 1}`;
  const appended: JobHunterConversationMessage = { ...message, id };
  return { ...thread, messages: [...thread.messages, appended], updatedAt: message.createdAt };
};

export const buildConversationDraft = (params: {
  type: JobHunterConversationType;
  snapshot: ApplicationJobSnapshot | JobPosting;
  now: Date;
}): JobHunterConversationDraft => {
  const company = params.snapshot.company;
  const title = params.snapshot.title;
  const createdAt = nowIso(params.now);

  if (params.type === "initial_outreach") {
    return {
      type: params.type,
      subject: `Intro: ${title} at ${company}`,
      body: `Hi ${company} team,\n\nI am reaching out about the ${title} role. I would value a brief conversation on team needs and fit.\n\nBest regards,`,
      createdAt,
    };
  }

  if (params.type === "follow_up") {
    return {
      type: params.type,
      subject: `Follow-up on ${title} application`,
      body: `Hi ${company} team,\n\nFollowing up on my application for ${title}. Happy to provide any additional context.\n\nBest regards,`,
      createdAt,
    };
  }

  return {
    type: params.type,
    subject: `Thank you — ${title} discussion`,
    body: `Hi ${company} team,\n\nThank you for taking time to speak with me about ${title}. I appreciated learning more about the role and team priorities.\n\nBest regards,`,
    createdAt,
  };
};
