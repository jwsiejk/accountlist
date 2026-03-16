import { buildCleanPostingSummary, cleanInlineSourceText } from "../textCleanup";
import { normalizeJobPosting } from "../normalize";
import type { JobPosting, JobSourceConfig } from "../types";

type SmartRecruitersDepartment = {
  label?: string;
};

type SmartRecruitersLocation = {
  city?: string;
  region?: string;
  country?: string;
  remote?: boolean;
};

type SmartRecruitersJob = {
  id?: string;
  name?: string;
  releasedDate?: string;
  location?: SmartRecruitersLocation;
  department?: SmartRecruitersDepartment;
  typeOfEmployment?: string;
  refNumber?: string;
};

type SmartRecruitersListingsResponse = {
  content?: SmartRecruitersJob[];
};

type SmartRecruitersDetailsResponse = {
  jobAd?: {
    sections?: Array<{ title?: string; text?: string }>;
  };
  compensation?: {
    description?: string;
  };
};

const formatLocation = (location?: SmartRecruitersLocation) => {
  if (!location) {
    return undefined;
  }
  if (location.remote) {
    return "Remote";
  }

  return [location.city, location.region, location.country].filter(Boolean).join(", ");
};

const fetchDetails = async (company: string, id: string) => {
  const endpoint = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(id)}`;
  const res = await fetch(endpoint, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }

  return (await res.json()) as SmartRecruitersDetailsResponse;
};

const detailsNotes = (details: SmartRecruitersDetailsResponse | null) => {
  if (!details) {
    return undefined;
  }

  const sections = details.jobAd?.sections?.map((section) => `${section.title ? `${section.title}: ` : ""}${section.text ?? ""}`);
  return buildCleanPostingSummary(sections ?? [], { maxLength: 950 });
};

export async function fetchSmartRecruitersJobs(source: JobSourceConfig): Promise<JobPosting[]> {
  const endpoint = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(source.boardToken)}/postings?limit=100`;
  const res = await fetch(endpoint, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`SmartRecruiters fetch failed (${res.status})`);
  }

  const data = (await res.json()) as SmartRecruitersListingsResponse;
  const jobs = Array.isArray(data.content) ? data.content : [];

  const normalized = await Promise.all(
    jobs
      .filter((job) => !!job.id && !!job.name)
      .map(async (job) => {
        const id = job.id!;
        const details = await fetchDetails(source.boardToken, id);
        const salaryRange = cleanInlineSourceText(details?.compensation?.description, 120);

        return normalizeJobPosting({
          source: "smartrecruiters",
          externalId: id,
          company: source.company,
          title: job.name!,
          location: formatLocation(job.location),
          department: job.department?.label,
          salaryRange,
          employmentType: job.typeOfEmployment,
          notes: detailsNotes(details),
          url: `https://jobs.smartrecruiters.com/${source.boardToken}/${id}`,
          postedAt: job.releasedDate,
        });
      }),
  );

  return normalized;
}
