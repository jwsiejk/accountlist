const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const formatFixed = (value: number, digits: number, fallback: string): string => {
  if (!isFiniteNumber(value)) {
    return fallback;
  }

  return value.toFixed(digits);
};

export const formatPercent = (ratio: number, digits = 1, fallback = "—"): string => {
  if (!isFiniteNumber(ratio)) {
    return fallback;
  }

  return `${(ratio * 100).toFixed(digits)}%`;
};

export const formatGbps = (value: number, digits = 2, fallback = "—"): string => {
  const formatted = formatFixed(value, digits, fallback);
  return formatted === fallback ? fallback : `${formatted} Gbps`;
};

export const formatOps = (value: number, fallback = "—"): string => {
  const formatted = formatFixed(value, 0, fallback);
  return formatted === fallback ? fallback : `${formatted} ops`;
};

export const formatCount = (value: number, fallback = "—"): string => formatFixed(value, 0, fallback);

export const formatDecimal = (value: number, digits = 2, fallback = "—"): string => formatFixed(value, digits, fallback);
