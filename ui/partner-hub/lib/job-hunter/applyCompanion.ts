import type { ApplySessionPayload } from "./applySession";

export type SupportedApplyProvider = "greenhouse" | "lever" | "ashby" | "smartrecruiters";

export type BasicFieldKey =
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "location"
  | "linkedinUrl"
  | "websiteUrl"
  | "workAuthorizationNote"
  | "coverLetterText";

export type CompanionFieldCandidate = {
  tagName: string;
  id?: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: string;
};

const PROVIDER_PATTERNS: Record<SupportedApplyProvider, RegExp[]> = {
  greenhouse: [/greenhouse\.io/i],
  lever: [/lever\.co/i, /jobs\.lever\.co/i],
  ashby: [/ashbyhq\.com/i],
  smartrecruiters: [/smartrecruiters\.com/i],
};

const buildFieldSignal = (field: CompanionFieldCandidate) =>
  [field.id, field.name, field.placeholder, field.ariaLabel, field.labelText].filter(Boolean).join(" ").toLowerCase();

const hasAnyToken = (value: string, tokens: string[]) => tokens.some((token) => value.includes(token));

const COMMON_FIELD_TOKENS: Record<BasicFieldKey, string[]> = {
  fullName: ["full name", "fullname", "candidate name", "name"],
  firstName: ["first name", "firstname", "given name"],
  lastName: ["last name", "lastname", "family name", "surname"],
  email: ["email", "e-mail"],
  phone: ["phone", "mobile", "telephone"],
  location: ["city", "state", "location", "address"],
  linkedinUrl: ["linkedin"],
  websiteUrl: ["website", "portfolio", "github", "personal site", "url"],
  workAuthorizationNote: ["work authorization", "authorized", "sponsorship", "visa", "employment eligibility"],
  coverLetterText: ["cover letter", "why this role", "why do you want", "additional information"],
};

const PROVIDER_EXTRA_TOKENS: Partial<Record<SupportedApplyProvider, Partial<Record<BasicFieldKey, string[]>>>> = {
  greenhouse: {
    firstName: ["first_name"],
    lastName: ["last_name"],
    linkedinUrl: ["linkedin_url"],
  },
  lever: {
    fullName: ["name"],
    phone: ["phone number"],
  },
  ashby: {
    linkedinUrl: ["linkedin profile"],
  },
  smartrecruiters: {
    workAuthorizationNote: ["work permit", "authorized to work"],
  },
};


export const selectLocationValueFromCityState = (cityState: string, signal: string): string => {
  const source = String(cityState ?? "");
  const loweredSignal = String(signal ?? "").toLowerCase();
  const [city, stateRaw] = source.split(",");
  const state = stateRaw?.trim() ?? "";

  if (loweredSignal.includes("city") && !loweredSignal.includes("state")) {
    return city?.trim() || source;
  }

  if (loweredSignal.includes("state") && !loweredSignal.includes("city")) {
    return state || source;
  }

  return source;
};
export const detectApplyProviderFromUrl = (url: string): SupportedApplyProvider | null => {
  for (const [provider, patterns] of Object.entries(PROVIDER_PATTERNS) as [SupportedApplyProvider, RegExp[]][]) {
    if (patterns.some((pattern) => pattern.test(url))) {
      return provider;
    }
  }
  return null;
};

export const getFieldValueForKey = (fieldKey: BasicFieldKey, session: ApplySessionPayload): string => {
  switch (fieldKey) {
    case "fullName":
      return session.candidate.fullName;
    case "firstName":
      return session.candidate.firstName;
    case "lastName":
      return session.candidate.lastName;
    case "email":
      return session.candidate.email;
    case "phone":
      return session.candidate.phone;
    case "location":
      return session.candidate.cityState;
    case "linkedinUrl":
      return session.candidate.linkedinUrl;
    case "websiteUrl":
      return session.candidate.websiteUrl;
    case "workAuthorizationNote":
      return session.candidate.workAuthorizationNote;
    case "coverLetterText":
      return session.tailored.coverLetterText;
  }
};

export const matchBasicFieldKey = (
  field: CompanionFieldCandidate,
  provider?: SupportedApplyProvider | null,
): BasicFieldKey | null => {
  const signal = buildFieldSignal(field);
  if (!signal.trim()) {
    return null;
  }

  const isTextarea = field.tagName.toLowerCase() === "textarea";
  const rankedKeys: BasicFieldKey[] = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "linkedinUrl",
    "websiteUrl",
    "workAuthorizationNote",
    "coverLetterText",
    "location",
    "fullName",
  ];

  for (const key of rankedKeys) {
    if (key === "coverLetterText" && !isTextarea) {
      continue;
    }

    const providerTokens = provider ? PROVIDER_EXTRA_TOKENS[provider]?.[key] ?? [] : [];
    const tokens = [...COMMON_FIELD_TOKENS[key], ...providerTokens];

    if (!hasAnyToken(signal, tokens)) {
      continue;
    }

    if (key === "fullName" && (signal.includes("first") || signal.includes("last"))) {
      continue;
    }

    if (key === "location" && signal.includes("relocation")) {
      continue;
    }

    return key;
  }

  return null;
};
