"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchAccounts = void 0;
const normalize_1 = require("./normalize");
const DEFAULT_THRESHOLDS = {
    autoMatch: 92,
    review: 70,
};
const tokenize = (normalized) => normalized.split(/\s+/g).filter(Boolean);
const hashString = (value) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};
const tieBreakerValue = (seed, value) => {
    if (!seed) {
        return hashString(value);
    }
    return hashString(`${seed}:${value}`);
};
const prefixSimilarity = (left, right) => {
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
// Jaro-Winkler similarity (0..1). This is particularly effective for company names.
// Implemented locally (no deps) to keep the pipeline deterministic and fast.
const jaroWinklerSimilarity = (left, right) => {
    if (!left || !right) {
        return 0;
    }
    if (left === right) {
        return 1;
    }
    const s1 = left;
    const s2 = right;
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0 || len2 === 0) {
        return 0;
    }
    const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    let matches = 0;
    for (let i = 0; i < len1; i += 1) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, len2);
        for (let j = start; j < end; j += 1) {
            if (s2Matches[j]) {
                continue;
            }
            if (s1[i] !== s2[j]) {
                continue;
            }
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches += 1;
            break;
        }
    }
    if (matches === 0) {
        return 0;
    }
    let t = 0;
    let k = 0;
    for (let i = 0; i < len1; i += 1) {
        if (!s1Matches[i]) {
            continue;
        }
        while (k < len2 && !s2Matches[k]) {
            k += 1;
        }
        if (k < len2 && s1[i] !== s2[k]) {
            t += 1;
        }
        k += 1;
    }
    const transpositions = t / 2;
    const m = matches;
    const jaro = (m / len1 + m / len2 + (m - transpositions) / m) / 3;
    // Winkler adjustment
    let prefix = 0;
    const maxPrefix = 4;
    const prefixLimit = Math.min(maxPrefix, Math.min(len1, len2));
    for (let i = 0; i < prefixLimit; i += 1) {
        if (s1[i] !== s2[i]) {
            break;
        }
        prefix += 1;
    }
    const scalingFactor = 0.1;
    return jaro + prefix * scalingFactor * (1 - jaro);
};
const tokenWeight = (weights, token) => weights.get(token) ?? 1;
const tokenOverlapScore = (leftTokens, rightTokens, weights) => {
    if (leftTokens.length === 0 || rightTokens.length === 0) {
        return 0;
    }
    const used = new Array(rightTokens.length).fill(false);
    let matchedWeight = 0;
    const leftTotalWeight = leftTokens.reduce((sum, token) => sum + tokenWeight(weights, token), 0);
    const rightTotalWeight = rightTokens.reduce((sum, token) => sum + tokenWeight(weights, token), 0);
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
            const rightToken = rightTokens[matchIndex];
            matchedWeight += Math.max(tokenWeight(weights, leftToken), tokenWeight(weights, rightToken));
        }
    });
    const unionWeight = leftTotalWeight + rightTotalWeight - matchedWeight;
    if (unionWeight <= 0) {
        return 0;
    }
    return matchedWeight / unionWeight;
};
const scoreSimilarity = (left, right, weights) => {
    const tokenScore = tokenOverlapScore(left.tokens, right.tokens, weights);
    const jwScore = jaroWinklerSimilarity(left.normalizedName, right.normalizedName);
    const prefixScore = prefixSimilarity(left.normalizedName, right.normalizedName);
    // Blend:
    // - weighted token overlap is the primary signal
    // - Jaro-Winkler captures small edits/transpositions in company names
    // - prefix similarity keeps behavior aligned with the prior implementation
    const combined = tokenScore * 0.45 + jwScore * 0.35 + prefixScore * 0.2;
    const score = Math.round(combined * 100);
    const reasons = [`weighted token overlap ${tokenScore.toFixed(2)}`];
    if (jwScore > 0) {
        reasons.push(`jaro-winkler ${jwScore.toFixed(2)}`);
    }
    if (prefixScore > 0) {
        reasons.push(`prefix similarity ${prefixScore.toFixed(2)}`);
    }
    return { score, reasons };
};
const toMatchType = (score, thresholds) => {
    if (score >= thresholds.autoMatch) {
        return "strong";
    }
    return "weak";
};
const toStatus = (score, thresholds) => {
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
const indexAccounts = (entries) => {
    const byExact = new Map();
    const byBlock = new Map();
    const tokenDocFreq = new Map();
    entries.forEach((entry) => {
        const normalizedName = (0, normalize_1.normalizeName)(entry.name);
        const blockKey = (0, normalize_1.blockingKey)(normalizedName);
        const blockKeys = (0, normalize_1.blockingKeys)(normalizedName);
        const indexed = {
            ...entry,
            normalizedName,
            blockKey,
            blockKeys,
            tokens: tokenize(normalizedName),
        };
        // Token document frequency (count once per entry per token)
        if (indexed.tokens.length > 0) {
            const unique = new Set(indexed.tokens);
            unique.forEach((token) => {
                tokenDocFreq.set(token, (tokenDocFreq.get(token) ?? 0) + 1);
            });
        }
        if (normalizedName) {
            const existingExact = byExact.get(normalizedName) ?? [];
            existingExact.push(indexed);
            byExact.set(normalizedName, existingExact);
        }
        // Multi-block indexing.
        // Keep the original blockKey behavior, but also index into additional buckets
        // to improve recall when the first token differs.
        const keysToIndex = blockKeys.length > 0 ? blockKeys : blockKey ? [blockKey] : [];
        keysToIndex.forEach((key) => {
            if (!key) {
                return;
            }
            const existingBlock = byBlock.get(key) ?? [];
            existingBlock.push(indexed);
            byBlock.set(key, existingBlock);
        });
    });
    const totalDocs = Math.max(1, entries.length);
    const tokenWeights = new Map();
    tokenDocFreq.forEach((df, token) => {
        // IDF-lite: log((N+1)/(df+1)) + 1
        const weight = Math.log((totalDocs + 1) / (df + 1)) + 1;
        tokenWeights.set(token, weight);
    });
    return { byExact, byBlock, tokenWeights };
};
const matchAccounts = (sources, targets, options = {}) => {
    const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;
    const minScore = options.minScore ?? thresholds.review;
    const demoSeed = options.demoSeed ?? process.env.NEXT_PUBLIC_ACCOUNT_MAPPING_DEMO_SEED;
    const { byExact, byBlock, tokenWeights } = indexAccounts(targets);
    return sources.map((source) => {
        const normalizedName = (0, normalize_1.normalizeName)(source.name);
        const tokens = tokenize(normalizedName);
        const blockKey = (0, normalize_1.blockingKey)(normalizedName);
        const blockKeysForSource = (0, normalize_1.blockingKeys)(normalizedName);
        if (!normalizedName || tokens.length === 0 || (!blockKey && blockKeysForSource.length === 0)) {
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
                matchType: "exact",
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
        // Multi-block candidate expansion (union of buckets).
        const keysToQuery = blockKeysForSource.length > 0 ? blockKeysForSource : blockKey ? [blockKey] : [];
        const seen = new Set();
        const blockMatches = [];
        keysToQuery.forEach((key) => {
            const bucket = byBlock.get(key) ?? [];
            bucket.forEach((entry) => {
                if (seen.has(entry.id)) {
                    return;
                }
                seen.add(entry.id);
                blockMatches.push(entry);
            });
        });
        const scoredCandidates = [];
        blockMatches.forEach((entry) => {
            const { score, reasons } = scoreSimilarity({
                ...source,
                normalizedName,
                blockKey,
                blockKeys: blockKeysForSource.length > 0 ? blockKeysForSource : blockKey ? [blockKey] : [],
                tokens,
            }, entry, tokenWeights);
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
                reasons: ["same block bucket", ...reasons],
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
exports.matchAccounts = matchAccounts;
