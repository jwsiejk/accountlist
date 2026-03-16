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
