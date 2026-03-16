import type { BoardType } from "./types";

export type DetectedSource = {
  boardType: BoardType;
  boardToken: string;
  company?: string;
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const prettyCompany = (value: string) => {
  const slug = toSlug(value);
  if (!slug) {
    return undefined;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
};

const normalizeHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

const detectGreenhouse = (url: URL): DetectedSource | null => {
  const host = normalizeHost(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "boards.greenhouse.io" && parts.length > 0) {
    return { boardType: "greenhouse", boardToken: parts[0], company: prettyCompany(parts[0]) };
  }

  if (host === "job-boards.greenhouse.io" && parts.length > 0) {
    return { boardType: "greenhouse", boardToken: parts[0], company: prettyCompany(parts[0]) };
  }

  if (host === "boards-api.greenhouse.io" && parts[0] === "v1" && parts[1] === "boards" && parts[2]) {
    return { boardType: "greenhouse", boardToken: parts[2], company: prettyCompany(parts[2]) };
  }

  return null;
};

const detectLever = (url: URL): DetectedSource | null => {
  const host = normalizeHost(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "jobs.lever.co" && parts[0]) {
    return { boardType: "lever", boardToken: parts[0], company: prettyCompany(parts[0]) };
  }

  if (host === "api.lever.co" && parts[0] === "v0" && parts[1] === "postings" && parts[2]) {
    return { boardType: "lever", boardToken: parts[2], company: prettyCompany(parts[2]) };
  }

  return null;
};

const detectAshby = (url: URL): DetectedSource | null => {
  const host = normalizeHost(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "jobs.ashbyhq.com" && parts[0]) {
    return { boardType: "ashby", boardToken: parts[0], company: prettyCompany(parts[0]) };
  }

  if (host === "ashbyhq.com" && parts[0] === "api" && parts[1] === "non-user-portal" && parts[2] === "company" && parts[3]) {
    return { boardType: "ashby", boardToken: parts[3], company: prettyCompany(parts[3]) };
  }

  return null;
};

const detectSmartRecruiters = (url: URL): DetectedSource | null => {
  const host = normalizeHost(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);

  if ((host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") && parts[0]) {
    return { boardType: "smartrecruiters", boardToken: parts[0], company: prettyCompany(parts[0]) };
  }

  return null;
};

export const detectSourceFromUrl = (value: string): DetectedSource | null => {
  const input = value.trim();
  if (!input) {
    return null;
  }

  const parseUrl = (candidate: string) => {
    try {
      return new URL(candidate);
    } catch {
      return null;
    }
  };

  const url = parseUrl(input) ?? parseUrl(`https://${input}`);
  if (!url) {
    return null;
  }

  return detectGreenhouse(url) ?? detectLever(url) ?? detectAshby(url) ?? detectSmartRecruiters(url);
};
