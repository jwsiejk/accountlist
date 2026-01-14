import type { RawAccountMapping } from "./schema";

export const TEMPLATE_STORAGE_KEY = "partner-hub:account-mapping:templates";

export type MappingTemplate = {
  id: string;
  name: string;
  createdAt: string;
  vendorMapping: RawAccountMapping;
  partnerMapping: RawAccountMapping;
};

export const loadTemplates = (): MappingTemplate[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MappingTemplate[]) : [];
  } catch {
    return [];
  }
};

export const saveTemplates = (templates: MappingTemplate[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
};
