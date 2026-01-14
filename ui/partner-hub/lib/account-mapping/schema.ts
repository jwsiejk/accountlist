import { z } from "zod";

export const canonicalFields = [
  {
    key: "account_name",
    label: "Account name",
    required: true,
    description: "Primary account or company name.",
  },
  {
    key: "owner_name",
    label: "Owner name",
    required: false,
    description: "Account owner or salesperson assigned.",
  },
  {
    key: "manager_name",
    label: "Manager name",
    required: false,
    description: "Manager or team lead for the account.",
  },
  {
    key: "pam_name",
    label: "PAM name",
    required: false,
    description: "Partner account manager name.",
  },
  {
    key: "status",
    label: "Status",
    required: false,
    description: "Prospect or customer status.",
  },
  {
    key: "segment_type",
    label: "Segment / Type",
    required: false,
    description: "Segment or account type.",
  },
  {
    key: "city",
    label: "City",
    required: false,
    description: "Primary city for the account.",
  },
  {
    key: "state",
    label: "State",
    required: false,
    description: "Primary state or province.",
  },
  {
    key: "country",
    label: "Country",
    required: false,
    description: "Primary country or region.",
  },
  {
    key: "contacts",
    label: "Contacts",
    required: false,
    description: "Contact info (single column allowed).",
  },
  {
    key: "crm_account_id",
    label: "CRM account ID",
    required: false,
    description: "CRM system account identifier.",
  },
] as const;

export type CanonicalFieldKey = (typeof canonicalFields)[number]["key"];

export type RawAccountMapping = Record<CanonicalFieldKey, string>;
export type AccountMapping = Record<CanonicalFieldKey, string | null>;

export const accountMappingSchema = z.object({
  account_name: z.string().min(1, "Account name is required."),
  owner_name: z.string().nullable().optional(),
  manager_name: z.string().nullable().optional(),
  pam_name: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  segment_type: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  contacts: z.string().nullable().optional(),
  crm_account_id: z.string().nullable().optional(),
});

export const createEmptyRawMapping = (): RawAccountMapping =>
  canonicalFields.reduce((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {} as RawAccountMapping);

export const normalizeMapping = (mapping: RawAccountMapping): AccountMapping =>
  canonicalFields.reduce((acc, field) => {
    const value = mapping[field.key]?.trim();
    acc[field.key] = value ? value : null;
    return acc;
  }, {} as AccountMapping);

export const validateMapping = (mapping: RawAccountMapping) =>
  accountMappingSchema.safeParse(normalizeMapping(mapping));
