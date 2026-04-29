export const formatDate = (value?: string) => {
  if (!value) return "unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleDateString();
};

export const formatDateTime = (value?: string) => {
  if (!value) return "unknown time";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown time" : date.toLocaleString();
};
