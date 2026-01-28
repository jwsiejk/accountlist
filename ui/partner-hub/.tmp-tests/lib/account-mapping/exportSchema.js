"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetExportSchema = exports.targetExportHeaders = exports.mergedAccountExportSchema = exports.mergedAccountExportHeaders = void 0;
const zod_1 = require("zod");
exports.mergedAccountExportHeaders = [
    "vendor_account_name",
    "partner_account_name",
    "vendor_owner",
    "vendor_manager",
    "vendor_pam",
    "partner_owner",
    "partner_manager",
    "partner_pam",
    "vendor_status",
    "partner_status",
    "match_score",
    "match_type",
    "match_reasons",
];
exports.mergedAccountExportSchema = zod_1.z.object({
    vendor_account_name: zod_1.z.string(),
    partner_account_name: zod_1.z.string(),
    vendor_owner: zod_1.z.string(),
    vendor_manager: zod_1.z.string(),
    vendor_pam: zod_1.z.string(),
    partner_owner: zod_1.z.string(),
    partner_manager: zod_1.z.string(),
    partner_pam: zod_1.z.string(),
    vendor_status: zod_1.z.string(),
    partner_status: zod_1.z.string(),
    match_score: zod_1.z.string(),
    match_type: zod_1.z.string(),
    match_reasons: zod_1.z.string(),
});
exports.targetExportHeaders = [
    "vendor_account_name",
    "partner_account_name",
    "vendor_status",
    "partner_status",
    "match_score",
    "match_type",
    "match_reasons",
];
exports.targetExportSchema = zod_1.z.object({
    vendor_account_name: zod_1.z.string(),
    partner_account_name: zod_1.z.string(),
    vendor_status: zod_1.z.string(),
    partner_status: zod_1.z.string(),
    match_score: zod_1.z.string(),
    match_type: zod_1.z.string(),
    match_reasons: zod_1.z.string(),
});
