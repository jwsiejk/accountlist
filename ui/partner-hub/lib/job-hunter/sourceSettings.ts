import type { BoardType, JobSourceConfig } from "./types";

export type SourceForm = {
  company: string;
  boardType: BoardType;
  boardToken: string;
};

export const BOARD_TYPE_OPTIONS: BoardType[] = ["greenhouse", "lever", "ashby", "smartrecruiters"];

export const truncateBoardToken = (token: string) => {
  if (token.length <= 10) {
    return token;
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

export const getSourceValidationMessage = (form: SourceForm, sources: JobSourceConfig[]) => {
  const company = form.company.trim();
  const boardToken = form.boardToken.trim();

  if (!company || !boardToken) {
    return "Company and board token are required.";
  }

  const isDuplicate = sources.some((source) => source.boardType === form.boardType && source.boardToken === boardToken);
  if (isDuplicate) {
    return "That source already exists.";
  }

  return null;
};

export const toUserFacingSourceError = (message: string | undefined, fallback = "We could not complete that source request.") => {
  if (!message) {
    return fallback;
  }

  const normalized = message.trim();
  if (/Unexpected token\s*['"]?</i.test(normalized)) {
    return "The source response was not readable. Please verify the URL or try another source.";
  }

  return normalized;
};

export const parseBulkSourceInput = (value: string, boardType: BoardType): JobSourceConfig[] => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const deduped = new Map<string, JobSourceConfig>();

  lines.forEach((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 2) {
      return;
    }

    const [company, token] = parts;
    if (!company || !token) {
      return;
    }

    deduped.set(`${boardType}:${token.toLowerCase()}`, {
      company,
      boardType,
      boardToken: token,
    });
  });

  return Array.from(deduped.values());
};
