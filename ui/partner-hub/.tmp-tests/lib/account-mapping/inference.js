"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferMappingFromHeaders = void 0;
const schema_1 = require("./schema");
const normalizeHeader = (header) => header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const aliasMap = {
    account_name: ["account", "accountname", "company", "companyname", "customer", "customername"],
    owner_name: ["owner", "ownername", "accountowner", "accountrep", "salesrep", "ae"],
    owner_email: ["owneremail", "owneremailaddress", "accountowneremail", "owner email"],
    manager_name: ["manager", "managername", "accountmanager", "teamlead"],
    pam_name: ["pam", "partneraccountmanager", "partner manager", "partnerowner"],
    status: ["status", "accountstatus", "lifecycle", "stage"],
    segment_type: ["segment", "accountsegment", "type", "accounttype"],
    organization: ["organization", "org", "businessunit", "businessunitname"],
    region: ["region", "territory"],
    city: ["city", "town"],
    state: ["state", "province", "stateprovince"],
    country: ["country", "nation", "regioncountry"],
    contacts: ["contact", "contacts", "primarycontact", "email", "contactemail"],
    crm_account_id: ["crmaccountid", "accountid", "sfid", "salesforceid", "crm id"],
};
const findBestHeader = (headers, aliases, used) => {
    const normalizedHeaders = headers.map((header) => ({
        header,
        normalized: normalizeHeader(header),
    }));
    const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
    for (const alias of normalizedAliases) {
        const exactMatch = normalizedHeaders.find((item) => item.normalized === alias && !used.has(item.header));
        if (exactMatch) {
            return exactMatch.header;
        }
    }
    for (const alias of normalizedAliases) {
        const partialMatch = normalizedHeaders.find((item) => item.normalized.includes(alias) && !used.has(item.header));
        if (partialMatch) {
            return partialMatch.header;
        }
    }
    return "";
};
const inferMappingFromHeaders = (headers) => {
    const mapping = (0, schema_1.createEmptyRawMapping)();
    const used = new Set();
    schema_1.canonicalFields.forEach((field) => {
        const aliases = aliasMap[field.key] ?? [];
        const match = findBestHeader(headers, aliases, used);
        if (match) {
            mapping[field.key] = match;
            used.add(match);
        }
    });
    return mapping;
};
exports.inferMappingFromHeaders = inferMappingFromHeaders;
