"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatComboboxOptionLabel = exports.toComboboxOption = void 0;
const toComboboxOption = (option) => typeof option === "string" ? { value: option } : option;
exports.toComboboxOption = toComboboxOption;
const formatComboboxOptionLabel = (option) => {
    const baseLabel = option.label ?? option.value;
    if (option.count === undefined) {
        return baseLabel;
    }
    return `${baseLabel} (${option.count})`;
};
exports.formatComboboxOptionLabel = formatComboboxOptionLabel;
