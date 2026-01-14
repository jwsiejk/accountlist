export type MergedSearchDatasetSelection = "run" | "upload";

type MergedSearchDatasetAvailability = {
  hasRunDataset: boolean;
  hasUploadedDataset: boolean;
};

export const resolveMergedSearchDataset = (
  selection: MergedSearchDatasetSelection,
  availability: MergedSearchDatasetAvailability,
) => {
  if (!availability.hasRunDataset && availability.hasUploadedDataset) {
    return "upload";
  }

  return selection;
};
