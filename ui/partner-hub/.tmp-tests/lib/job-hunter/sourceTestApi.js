"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSourceTestStatus = void 0;
const getSourceTestStatus = (payload) => {
    if (!payload.result) {
        return 400;
    }
    return payload.success && payload.result.success ? 200 : 422;
};
exports.getSourceTestStatus = getSourceTestStatus;
