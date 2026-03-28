"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildValidatedCatalogPacks = exports.validateCatalogDefinition = exports.dedupeSourcesByProviderToken = exports.toProviderTokenKey = exports.normalizeCatalogSource = void 0;
const BOARD_TYPES = ["greenhouse", "lever", "ashby", "smartrecruiters"];
const isBoardType = (value) => BOARD_TYPES.includes(value);
const normalizeString = (value) => (value ?? "").trim();
const normalizeCatalogSource = (source) => ({
    company: normalizeString(source.company),
    boardType: normalizeString(source.boardType).toLowerCase(),
    boardToken: normalizeString(source.boardToken).toLowerCase(),
});
exports.normalizeCatalogSource = normalizeCatalogSource;
const toProviderTokenKey = (source) => `${source.boardType}:${source.boardToken.trim().toLowerCase()}`;
exports.toProviderTokenKey = toProviderTokenKey;
const dedupeSourcesByProviderToken = (sources) => {
    const sourceMap = new Map();
    sources.forEach((source) => {
        const normalized = (0, exports.normalizeCatalogSource)(source);
        sourceMap.set((0, exports.toProviderTokenKey)(normalized), normalized);
    });
    return Array.from(sourceMap.values());
};
exports.dedupeSourcesByProviderToken = dedupeSourcesByProviderToken;
const validateCatalogDefinition = (rawPacks, defaultPackOrder) => {
    const errors = [];
    const packIds = new Set();
    const packs = rawPacks.map((pack, packIndex) => {
        if (!pack.id) {
            errors.push(`pack[${packIndex}] is missing id`);
        }
        if (packIds.has(pack.id)) {
            errors.push(`pack \"${pack.id}\" is duplicated`);
        }
        packIds.add(pack.id);
        const label = normalizeString(pack.label);
        const description = normalizeString(pack.description);
        if (!label) {
            errors.push(`pack \"${pack.id}\" is missing label`);
        }
        if (!description) {
            errors.push(`pack \"${pack.id}\" is missing description`);
        }
        const roleKeywords = Array.from(new Set((pack.roleKeywords ?? [])
            .map((keyword) => normalizeString(keyword).toLowerCase())
            .filter(Boolean)));
        if (roleKeywords.length === 0) {
            errors.push(`pack \"${pack.id}\" must include role keywords`);
        }
        const normalizedSources = (pack.sources ?? []).map((source, sourceIndex) => {
            const normalized = (0, exports.normalizeCatalogSource)(source);
            if (!normalized.company) {
                errors.push(`pack \"${pack.id}\" source[${sourceIndex}] is missing company`);
            }
            if (!normalized.boardToken) {
                errors.push(`pack \"${pack.id}\" source[${sourceIndex}] is missing board token`);
            }
            if (!isBoardType(normalized.boardType)) {
                errors.push(`pack \"${pack.id}\" source[${sourceIndex}] has invalid provider \"${normalized.boardType}\"`);
            }
            return normalized;
        });
        if (normalizedSources.length === 0) {
            errors.push(`pack \"${pack.id}\" must include sources`);
        }
        return {
            id: pack.id,
            label,
            description,
            roleKeywords,
            sources: (0, exports.dedupeSourcesByProviderToken)(normalizedSources),
        };
    });
    defaultPackOrder.forEach((packId) => {
        if (!packIds.has(packId)) {
            errors.push(`default pack order references unknown pack \"${packId}\"`);
        }
    });
    return { packs, errors };
};
exports.validateCatalogDefinition = validateCatalogDefinition;
const buildValidatedCatalogPacks = (rawPacks, defaultPackOrder) => {
    const { packs, errors } = (0, exports.validateCatalogDefinition)(rawPacks, defaultPackOrder);
    if (errors.length > 0) {
        throw new Error(`Invalid source catalog definition:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    }
    return packs;
};
exports.buildValidatedCatalogPacks = buildValidatedCatalogPacks;
