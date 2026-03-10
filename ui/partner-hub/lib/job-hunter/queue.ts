export const toggleJobSelection = (selectedJobIds: string[], jobId: string): string[] => {
  const cleanIds = Array.from(new Set(selectedJobIds.filter((id) => typeof id === "string" && id.trim().length > 0)));

  if (cleanIds.includes(jobId)) {
    return cleanIds.filter((id) => id !== jobId);
  }

  return [...cleanIds, jobId];
};

export const isJobSelected = (selectedJobIds: string[], jobId: string) => selectedJobIds.includes(jobId);
