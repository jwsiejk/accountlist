import type { JobSourceConfig } from "./types";

export type CatalogSourcePackId =
  | "solutions-architecture"
  | "sales-engineering"
  | "customer-success-tam"
  | "partner-channel"
  | "infrastructure-cloud-platform"
  | "storage-data-protection";

export type CatalogSourcePack = {
  id: CatalogSourcePackId;
  label: string;
  description: string;
  roleKeywords: string[];
  sources: JobSourceConfig[];
};

export type CatalogSourceInput = Partial<JobSourceConfig> & {
  company?: string;
};

export type CatalogSourcePackInput = {
  id: CatalogSourcePackId;
  label: string;
  description: string;
  roleKeywords: string[];
  sources: CatalogSourceInput[];
};
