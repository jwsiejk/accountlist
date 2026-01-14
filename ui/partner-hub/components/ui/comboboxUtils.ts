export type ComboboxOption = {
  value: string;
  label?: string;
  count?: number;
};

export type ComboboxOptionInput = string | ComboboxOption;

export const toComboboxOption = (option: ComboboxOptionInput): ComboboxOption =>
  typeof option === "string" ? { value: option } : option;

export const formatComboboxOptionLabel = (option: ComboboxOption) => {
  const baseLabel = option.label ?? option.value;
  if (option.count === undefined) {
    return baseLabel;
  }
  return `${baseLabel} (${option.count})`;
};
