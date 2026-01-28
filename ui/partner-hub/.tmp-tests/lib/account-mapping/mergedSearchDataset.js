"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMergedSearchDataset = void 0;
const resolveMergedSearchDataset = (selection, availability) => {
    if (!availability.hasRunDataset && availability.hasUploadedDataset) {
        return "upload";
    }
    return selection;
};
exports.resolveMergedSearchDataset = resolveMergedSearchDataset;
