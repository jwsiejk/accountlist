import { buildAtsArtifactFileName } from "./docExports";
import type { ApplyPacket } from "./applyPacket";
import type { TailoringPacket } from "./resume/tailor";
import type { JobPosting, ResumeProfile } from "./types";

export type ApplySessionPayload = {
  version: "1";
  sessionId: string;
  jobId: string;
  provider: JobPosting["sourceProvider"] | "unknown";
  sourceUrl: string;
  candidate: {
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cityState: string;
    linkedinUrl: string;
    websiteUrl: string;
    workAuthorizationNote: string;
  };
  tailored: {
    headline: string;
    summary: string;
    coverLetterText: string;
    screenerAnswers: { question: string; answer: string }[];
  };
  artifacts: {
    tailoredResumeDocxFileName: string;
    coverLetterDocxFileName: string;
    applyPacketFileName: string;
  };
};

const splitName = (fullName: string) => {
  const compact = fullName.trim().replace(/\s+/g, " ");
  const [firstName = "", ...rest] = compact.split(" ");
  return {
    firstName,
    lastName: rest.join(" "),
  };
};

export const buildApplySessionPayload = (
  job: JobPosting,
  tailoringPacket: TailoringPacket,
  applyPacket: ApplyPacket,
  profile?: ResumeProfile,
): ApplySessionPayload => {
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
      tailoredResumeDocxFileName: buildAtsArtifactFileName(fullName || "candidate", job.company, job.title, "resume"),
      coverLetterDocxFileName: buildAtsArtifactFileName(fullName || "candidate", job.company, job.title, "cover-letter"),
      applyPacketFileName: `${applyPacket.fileBaseName}.md`,
    },
  };
};

export const toApplySessionJson = (payload: ApplySessionPayload) => `${JSON.stringify(payload, null, 2)}\n`;
