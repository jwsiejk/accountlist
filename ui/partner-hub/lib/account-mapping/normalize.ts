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
  const stripped = tokens.filter((token) => !LEGAL_SUFFIXES.has(token));

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
