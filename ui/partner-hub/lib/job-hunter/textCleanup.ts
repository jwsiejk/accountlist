const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const LINE_BOILERPLATE_PATTERNS = [
  /^(?:apply|apply now|click here to apply|submit application)\.?$/i,
  /^back to jobs\.?$/i,
  /^(?:home|jobs|careers|privacy policy|terms(?: of use| and conditions)?)\s*(?:\||\/|·)?\s*(?:home|jobs|careers|privacy policy|terms(?: of use| and conditions)?)*$/i,
  /all qualified applicants will receive consideration/i,
  /equal opportunity employer/i,
  /eeo(?: statement)?/i,
  /reasonable accommodation/i,
  /powered by (?:greenhouse|lever)/i,
  /cookie (?:policy|settings)/i,
];

type CleanSourceTextOptions = {
  preserveNewlines?: boolean;
};

type BuildSummaryOptions = {
  maxLength?: number;
};

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const decodeHtmlEntities = (value: string) => {
  return value
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const decoded = NAMED_ENTITIES[name.toLowerCase()];
      return decoded ?? match;
    })
    .replace(/&#(x?[0-9a-f]+);/gi, (match, numeric: string) => {
      const isHex = /^x/i.test(numeric);
      const parsed = Number.parseInt(isHex ? numeric.slice(1) : numeric, isHex ? 16 : 10);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 0x10ffff) {
        return match;
      }

      try {
        return String.fromCodePoint(parsed);
      } catch {
        return match;
      }
    });
};

const toStructuredText = (value: string) => {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<(?:br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
};

const normalizeLines = (value: string) => {
  const lines = value
    .split("\n")
    .map((line) => collapseWhitespace(line))
    .filter(Boolean);

  const dedupedAdjacent: string[] = [];
  for (const line of lines) {
    if ((dedupedAdjacent[dedupedAdjacent.length - 1] ?? "").toLowerCase() === line.toLowerCase()) {
      continue;
    }

    dedupedAdjacent.push(line);
  }

  return dedupedAdjacent;
};

const isBoilerplate = (line: string) => {
  if (line.length > 280) {
    return false;
  }

  return LINE_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(line));
};

export const cleanSourceText = (value?: string, options: CleanSourceTextOptions = {}) => {
  if (!value) {
    return undefined;
  }

  const decoded = decodeHtmlEntities(toStructuredText(value));
  const lines = normalizeLines(decoded);
  if (lines.length === 0) {
    return undefined;
  }

  return options.preserveNewlines ? lines.join("\n") : lines.join(" ");
};

const trimToBoundary = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  const slice = value.slice(0, maxLength).trimEnd();
  const sentenceBoundary = slice.search(/[.!?](?=\s+[^\s]|$)(?!.*[.!?](?=\s+[^\s]|$))/);
  if (sentenceBoundary >= Math.floor(maxLength * 0.6)) {
    return `${slice.slice(0, sentenceBoundary + 1).trimEnd()}…`;
  }

  const wordBoundary = slice.lastIndexOf(" ");
  if (wordBoundary >= Math.floor(maxLength * 0.6)) {
    return `${slice.slice(0, wordBoundary).trimEnd()}…`;
  }

  return `${slice}…`;
};

export const buildCleanPostingSummary = (parts: Array<string | undefined>, options: BuildSummaryOptions = {}) => {
  const maxLength = options.maxLength ?? 950;
  const lines = parts
    .map((part) => cleanSourceText(part, { preserveNewlines: true }))
    .filter((part): part is string => Boolean(part))
    .flatMap((part) => part.split("\n"))
    .map((line) => collapseWhitespace(line))
    .filter((line) => Boolean(line) && !isBoilerplate(line));

  if (lines.length === 0) {
    return undefined;
  }

  const seen = new Set<string>();
  const uniqueLines: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueLines.push(line);
  }

  const summary = collapseWhitespace(uniqueLines.join(" "));
  return summary ? trimToBoundary(summary, maxLength) : undefined;
};

export const cleanInlineSourceText = (value?: string, maxLength?: number) => {
  const cleaned = cleanSourceText(value);
  if (!cleaned) {
    return undefined;
  }

  return maxLength ? trimToBoundary(cleaned, maxLength) : cleaned;
};
