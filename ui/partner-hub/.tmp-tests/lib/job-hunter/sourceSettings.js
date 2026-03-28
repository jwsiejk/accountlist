"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBulkSourceInput = exports.toUserFacingSourceError = exports.getSourceValidationMessage = exports.truncateBoardToken = exports.BOARD_TYPE_OPTIONS = void 0;
exports.BOARD_TYPE_OPTIONS = ["greenhouse", "lever", "ashby", "smartrecruiters"];
const truncateBoardToken = (token) => {
    if (token.length <= 10) {
        return token;
    }
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
};
exports.truncateBoardToken = truncateBoardToken;
const getSourceValidationMessage = (form, sources) => {
    const company = form.company.trim();
    const boardToken = form.boardToken.trim();
    if (!company || !boardToken) {
        return "Company and board token are required.";
    }
    const isDuplicate = sources.some((source) => source.boardType === form.boardType && source.boardToken === boardToken);
    if (isDuplicate) {
        return "That source already exists.";
    }
    return null;
};
exports.getSourceValidationMessage = getSourceValidationMessage;
const toUserFacingSourceError = (message, fallback = "We could not complete that source request.") => {
    if (!message) {
        return fallback;
    }
    const normalized = message.trim();
    if (/Unexpected token\s*['"]?</i.test(normalized)) {
        return "The source response was not readable. Please verify the URL or try another source.";
    }
    return normalized;
};
exports.toUserFacingSourceError = toUserFacingSourceError;
const parseBulkSourceInput = (value, boardType) => {
    const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const deduped = new Map();
    lines.forEach((line) => {
        const parts = line.split("|").map((part) => part.trim());
        if (parts.length < 2) {
            return;
        }
        const [company, token] = parts;
        if (!company || !token) {
            return;
        }
        deduped.set(`${boardType}:${token.toLowerCase()}`, {
            company,
            boardType,
            boardToken: token,
        });
    });
    return Array.from(deduped.values());
};
exports.parseBulkSourceInput = parseBulkSourceInput;
