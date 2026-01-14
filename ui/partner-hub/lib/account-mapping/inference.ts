import { canonicalFields, createEmptyRawMapping, type RawAccountMapping } from "./schema";

const normalizeHeader = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const aliasMap: Record<string, string[]> = {
  account_name: ["account", "accountname", "company", "companyname", "customer", "customername"],
  owner_name: ["owner", "ownername", "accountowner", "accountrep", "salesrep", "ae"],
  manager_name: ["manager", "managername", "accountmanager", "teamlead"],
  pam_name: ["pam", "partneraccountmanager", "partner manager", "partnerowner"],
  status: ["status", "accountstatus", "lifecycle", "stage"],
  segment_type: ["segment", "accountsegment", "type", "accounttype"],
  city: ["city", "town"],
  state: ["state", "province", "region", "stateprovince"],
  country: ["country", "nation", "regioncountry"],
  contacts: ["contact", "contacts", "primarycontact", "email", "contactemail"],
  crm_account_id: ["crmaccountid", "accountid", "sfid", "salesforceid", "crm id"],
};

const findBestHeader = (headers: string[], aliases: string[], used: Set<string>) => {
  const normalizedHeaders = headers.map((header) => ({
    header,
    normalized: normalizeHeader(header),
  }));

  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));

  for (const alias of normalizedAliases) {
    const exactMatch = normalizedHeaders.find(
      (item) => item.normalized === alias && !used.has(item.header),
    );
    if (exactMatch) {
      return exactMatch.header;
    }
  }

  for (const alias of normalizedAliases) {
    const partialMatch = normalizedHeaders.find(
      (item) => item.normalized.includes(alias) && !used.has(item.header),
    );
    if (partialMatch) {
      return partialMatch.header;
    }
  }

  return "";
};

export const inferMappingFromHeaders = (headers: string[]): RawAccountMapping => {
  const mapping = createEmptyRawMapping();
  const used = new Set<string>();

  canonicalFields.forEach((field) => {
    const aliases = aliasMap[field.key] ?? [];
    const match = findBestHeader(headers, aliases, used);
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  });

  return mapping;
};
