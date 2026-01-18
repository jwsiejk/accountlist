const LEGAL_SUFFIXES = new Set([
  "inc",
  "incorporated",
  "llc",
  "llp",
  "lp",
  "corp",
  "corporation",
  "co",
  "company",
  "ltd",
  "limited",
  "holdings",
  "group",
  "plc",
]);

// Common low-signal words that frequently appear in account names.
// Keep this list conservative and easy to tweak.
const NOISE_TOKENS = new Set([
  "the",
  "and",
  "of",
  "for",
  "services",
  "service",
  "solutions",
  "solution",
  "systems",
  "system",
  "international",
  "global",
  "technologies",
  "technology",
  "tech",
]);

const combineSingleLetterTokens = (tokens: string[]): string[] => {
  const combined: string[] = [];
  let buffer = "";

  for (const token of tokens) {
    if (token.length === 1 && /^[a-z]$/.test(token)) {
      buffer += token;
      continue;
    }

    if (buffer) {
      combined.push(buffer);
      buffer = "";
    }

    combined.push(token);
  }

  if (buffer) {
    combined.push(buffer);
  }

  return combined;
};

export const normalizeName = (raw: string): string => {
  if (!raw) {
    return "";
  }

  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const tokens = combineSingleLetterTokens(cleaned.split(/\s+/g).filter(Boolean));
  const stripped = tokens.filter(
    (token) => !LEGAL_SUFFIXES.has(token) && !NOISE_TOKENS.has(token),
  );

  return stripped.join(" ");
};

export const blockingKey = (normalizedName: string): string => {
  if (!normalizedName) {
    return "";
  }

  const tokens = normalizedName.split(/\s+/g).filter(Boolean);
  if (tokens.length === 0) {
    return "";
  }

  return `${tokens[0]}:${normalizedName.slice(0, 6)}`;
};

export const blockingKeys = (normalizedName: string): string[] => {
  if (!normalizedName) {
    return [];
  }

  const tokens = normalizedName.split(/\s+/g).filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }

  const prefix = normalizedName.slice(0, 6);
  const keys: string[] = [];

  // Original key (kept for backwards compatibility).
  keys.push(`${tokens[0]}:${prefix}`);

  // Longest token key (helps when first token differs: e.g., "saint" vs "st", acronyms, etc.).
  let longest = tokens[0];
  for (const token of tokens) {
    if (token.length > longest.length) {
      longest = token;
    }
  }
  keys.push(`${longest}:${prefix}`);

  // First 2-char prefix of the first token (adds a looser bucket).
  if (tokens[0].length >= 2) {
    keys.push(`${tokens[0].slice(0, 2)}:${prefix}`);
  }

  // Acronym key (e.g., "international business machines" => "ibm").
  const acronym = tokens
    .filter((t) => t.length > 0)
    .map((t) => t[0])
    .join("");
  if (acronym.length >= 2) {
    keys.push(`${acronym}:${prefix}`);
  }

  // De-dupe while preserving order.
  return Array.from(new Set(keys));
};
