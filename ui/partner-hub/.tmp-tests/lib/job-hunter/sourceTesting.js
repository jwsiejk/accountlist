"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testJobSource = void 0;
const syncEngine_1 = require("./syncEngine");
const testJobSource = async (source) => {
    try {
        const jobs = await (0, syncEngine_1.fetchJobsForSource)(source);
        return {
            sourceId: `${source.boardType}:${source.boardToken}`,
            company: source.company,
            provider: source.boardType,
            token: source.boardToken,
            success: true,
            jobsFetched: jobs.length,
        };
    }
    catch (error) {
        return {
            sourceId: `${source.boardType}:${source.boardToken}`,
            company: source.company,
            provider: source.boardType,
            token: source.boardToken,
            success: false,
            jobsFetched: 0,
            error: error instanceof Error ? error.message : "Unknown source test error",
        };
    }
};
exports.testJobSource = testJobSource;
