import type { BoardType, JobSourceConfig } from "./types";
import type { CatalogSourceInput, CatalogSourcePack, CatalogSourcePackId, CatalogSourcePackInput } from "./sourceCatalogTypes";

const BOARD_TYPES: BoardType[] = ["greenhouse", "lever", "ashby", "smartrecruiters"];

const isBoardType = (value: string): value is BoardType => BOARD_TYPES.includes(value as BoardType);

const normalizeString = (value: string | undefined) => (value ?? "").trim();

export const normalizeCatalogSource = (source: CatalogSourceInput): JobSourceConfig => ({
  company: normalizeString(source.company),
  boardType: normalizeString(source.boardType).toLowerCase() as BoardType,
  boardToken: normalizeString(source.boardToken).toLowerCase(),
});

export const toProviderTokenKey = (source: Pick<JobSourceConfig, "boardType" | "boardToken">) =>
  `${source.boardType}:${source.boardToken.trim().toLowerCase()}`;

export const dedupeSourcesByProviderToken = (sources: JobSourceConfig[]) => {
  const sourceMap = new Map<string, JobSourceConfig>();

  sources.forEach((source) => {
    const normalized = normalizeCatalogSource(source);
    sourceMap.set(toProviderTokenKey(normalized), normalized);
  });

  return Array.from(sourceMap.values());
};

export const validateCatalogDefinition = (
  rawPacks: CatalogSourcePackInput[],
  defaultPackOrder: CatalogSourcePackId[],
): { packs: CatalogSourcePack[]; errors: string[] } => {
  const errors: string[] = [];
  const packIds = new Set<string>();

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

    const roleKeywords = Array.from(
      new Set(
        (pack.roleKeywords ?? [])
          .map((keyword) => normalizeString(keyword).toLowerCase())
          .filter(Boolean),
      ),
    );

    if (roleKeywords.length === 0) {
      errors.push(`pack \"${pack.id}\" must include role keywords`);
    }

    const normalizedSources = (pack.sources ?? []).map((source, sourceIndex) => {
      const normalized = normalizeCatalogSource(source);

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
      sources: dedupeSourcesByProviderToken(normalizedSources),
    } satisfies CatalogSourcePack;
  });

  defaultPackOrder.forEach((packId) => {
    if (!packIds.has(packId)) {
      errors.push(`default pack order references unknown pack \"${packId}\"`);
    }
  });

  return { packs, errors };
};

export const buildValidatedCatalogPacks = (
  rawPacks: CatalogSourcePackInput[],
  defaultPackOrder: CatalogSourcePackId[],
) => {
  const { packs, errors } = validateCatalogDefinition(rawPacks, defaultPackOrder);

  if (errors.length > 0) {
    throw new Error(`Invalid source catalog definition:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return packs;
};
