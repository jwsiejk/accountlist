import { blockingKey, normalizeName } from "./normalize";

export type MatchType = "exact" | "strong" | "weak";

export interface AccountEntry {
  id: string;
  name: string;
}

export interface MatchCandidate {
  id: string;
  name: string;
  normalizedName: string;
  score: number;
  matchType: MatchType;
  reasons: string[];
}

export interface MatchResult {
  source: AccountEntry;
  normalizedName: string;
  candidates: MatchCandidate[];
  best: MatchCandidate | null;
  status: "autoMatch" | "review" | "unmatched";
}

export interface MatchThresholds {
  autoMatch: number;
  review: number;
}

export interface MatchOptions {
  thresholds?: MatchThresholds;
  minScore?: number;
  demoSeed?: string;
}

interface IndexedEntry extends AccountEntry {
  normalizedName: string;
  blockKey: string;
  tokens: string[];
}

const DEFAULT_THRESHOLDS: MatchThresholds = {
  autoMatch: 92,
  review: 70,
};

const tokenize = (normalized: string): string[] =>
  normalized.split(/\s+/g).filter(Boolean);

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const tieBreakerValue = (seed: string | undefined, value: string): number => {
  if (!seed) {
    return hashString(value);
  }
  return hashString(`${seed}:${value}`);
};

const prefixSimilarity = (left: string, right: string): number => {
  const minLength = Math.min(left.length, right.length);
  if (minLength === 0) {
    return 0;
  }

  let matchLength = 0;
  for (let i = 0; i < minLength; i += 1) {
    if (left[i] !== right[i]) {
      break;
    }
    matchLength += 1;
  }

  return matchLength / minLength;
};

const tokenOverlapScore = (leftTokens: string[], rightTokens: string[]): number => {
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const used = new Array(rightTokens.length).fill(false);
  let matches = 0;

  leftTokens.forEach((leftToken) => {
    const matchIndex = rightTokens.findIndex((rightToken, index) => {
      if (used[index]) {
        return false;
      }
      if (leftToken === rightToken) {
        return true;
      }
      if (leftToken.length >= 3 && rightToken.startsWith(leftToken)) {
        return true;
      }
      if (rightToken.length >= 3 && leftToken.startsWith(rightToken)) {
        return true;
      }
      return false;
    });

    if (matchIndex >= 0) {
      used[matchIndex] = true;
      matches += 1;
    }
  });

  const unionCount = leftTokens.length + rightTokens.length - matches;
  if (unionCount === 0) {
    return 0;
  }

  return matches / unionCount;
};

const scoreSimilarity = (left: IndexedEntry, right: IndexedEntry) => {
  const tokenScore = tokenOverlapScore(left.tokens, right.tokens);
  const prefixScore = prefixSimilarity(left.normalizedName, right.normalizedName);
  const combined = tokenScore * 0.7 + prefixScore * 0.3;
  const score = Math.round(combined * 100);

  const reasons = [`token overlap ${tokenScore.toFixed(2)}`];
  if (prefixScore > 0) {
    reasons.push(`prefix similarity ${prefixScore.toFixed(2)}`);
  }

  return { score, reasons };
};

const toMatchType = (score: number, thresholds: MatchThresholds): MatchType => {
  if (score >= thresholds.autoMatch) {
    return "strong";
  }
  return "weak";
};

const toStatus = (score: number | null, thresholds: MatchThresholds): MatchResult["status"] => {
  if (score === null) {
    return "unmatched";
  }
  if (score >= thresholds.autoMatch) {
    return "autoMatch";
  }
  if (score >= thresholds.review) {
    return "review";
  }
  return "unmatched";
};

const indexAccounts = (entries: AccountEntry[]) => {
  const byExact = new Map<string, IndexedEntry[]>();
  const byBlock = new Map<string, IndexedEntry[]>();

  entries.forEach((entry) => {
    const normalizedName = normalizeName(entry.name);
    const blockKey = blockingKey(normalizedName);
    const indexed: IndexedEntry = {
      ...entry,
      normalizedName,
      blockKey,
      tokens: tokenize(normalizedName),
    };

    if (normalizedName) {
      const existingExact = byExact.get(normalizedName) ?? [];
      existingExact.push(indexed);
      byExact.set(normalizedName, existingExact);
    }

    if (blockKey) {
      const existingBlock = byBlock.get(blockKey) ?? [];
      existingBlock.push(indexed);
      byBlock.set(blockKey, existingBlock);
    }
  });

  return { byExact, byBlock };
};

export const matchAccounts = (
  sources: AccountEntry[],
  targets: AccountEntry[],
  options: MatchOptions = {},
): MatchResult[] => {
  const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;
  const minScore = options.minScore ?? thresholds.review;
  const demoSeed = options.demoSeed ?? process.env.NEXT_PUBLIC_ACCOUNT_MAPPING_DEMO_SEED;
  const { byExact, byBlock } = indexAccounts(targets);

  return sources.map((source) => {
    const normalizedName = normalizeName(source.name);
    const tokens = tokenize(normalizedName);
    const blockKey = blockingKey(normalizedName);

    if (!normalizedName || tokens.length === 0 || !blockKey) {
      return {
        source,
        normalizedName,
        candidates: [],
        best: null,
        status: "unmatched",
      };
    }

    const exactMatches = byExact.get(normalizedName);
    if (exactMatches && exactMatches.length > 0) {
      const candidates = exactMatches.map((entry) => ({
        id: entry.id,
        name: entry.name,
        normalizedName: entry.normalizedName,
        score: 100,
        matchType: "exact" as const,
        reasons: ["same normalized name"],
      }));

      const best = candidates[0] ?? null;
      return {
        source,
        normalizedName,
        candidates,
        best,
        status: "autoMatch",
      };
    }

    const blockMatches = byBlock.get(blockKey) ?? [];
    const scoredCandidates: MatchCandidate[] = [];

    blockMatches.forEach((entry) => {
      const { score, reasons } = scoreSimilarity(
        { ...source, normalizedName, blockKey, tokens },
        entry,
      );

      if (score < minScore) {
        return;
      }

      const matchType = toMatchType(score, thresholds);
      scoredCandidates.push({
        id: entry.id,
        name: entry.name,
        normalizedName: entry.normalizedName,
        score,
        matchType,
        reasons: ["same block key", ...reasons],
      });
    });

    scoredCandidates.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      const leftTie = tieBreakerValue(demoSeed, left.id);
      const rightTie = tieBreakerValue(demoSeed, right.id);
      return leftTie - rightTie;
    });

    const best = scoredCandidates[0] ?? null;
    return {
      source,
      normalizedName,
      candidates: scoredCandidates,
      best,
      status: toStatus(best?.score ?? null, thresholds),
    };
  });
};
