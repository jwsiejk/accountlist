"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDecisionsToRows = exports.saveDecisions = exports.loadDecisions = exports.deserializeDecisions = exports.serializeDecisions = exports.buildDecisionKey = void 0;
const STORAGE_VERSION = 1;
const STORAGE_KEY = "partner-hub:account-mapping:decisions";
const DB_NAME = "partner-hub-account-mapping";
const STORE_NAME = "decision-store";
const STORE_KEY = "all";
const buildDecisionKey = (vendorAccountKey, partnerAccountKey, normalizedName) => `${vendorAccountKey}::${partnerAccountKey}::${normalizedName}`;
exports.buildDecisionKey = buildDecisionKey;
const isDecision = (value) => {
    if (!value || typeof value !== "object") {
        return false;
    }
    const decision = value;
    return (typeof decision.key === "string" &&
        typeof decision.vendorAccountKey === "string" &&
        typeof decision.partnerAccountKey === "string" &&
        typeof decision.normalizedName === "string" &&
        typeof decision.decision === "string" &&
        typeof decision.updatedAt === "string");
};
const serializeDecisions = (decisions) => JSON.stringify({
    version: STORAGE_VERSION,
    decisions,
});
exports.serializeDecisions = serializeDecisions;
const deserializeDecisions = (raw) => {
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
            return [];
        }
        if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.decisions)) {
            return [];
        }
        return parsed.decisions.filter(isDecision);
    }
    catch {
        return [];
    }
};
exports.deserializeDecisions = deserializeDecisions;
const openDecisionDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, STORAGE_VERSION);
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});
const loadFromIndexedDb = async () => {
    const db = await openDecisionDb();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(STORE_KEY);
        request.onsuccess = () => {
            const result = request.result;
            resolve(Array.isArray(result?.decisions) ? result?.decisions ?? [] : []);
        };
        request.onerror = () => resolve([]);
    });
};
const saveToIndexedDb = async (decisions) => {
    const db = await openDecisionDb();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put({ id: STORE_KEY, decisions });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
    });
};
const loadFromLocalStorage = () => {
    if (typeof window === "undefined") {
        return [];
    }
    return (0, exports.deserializeDecisions)(window.localStorage.getItem(STORAGE_KEY));
};
const saveToLocalStorage = (decisions) => {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(STORAGE_KEY, (0, exports.serializeDecisions)(decisions));
};
const supportsIndexedDb = () => typeof indexedDB !== "undefined";
const loadDecisions = async () => {
    if (!supportsIndexedDb()) {
        return loadFromLocalStorage();
    }
    try {
        return await loadFromIndexedDb();
    }
    catch {
        return loadFromLocalStorage();
    }
};
exports.loadDecisions = loadDecisions;
const saveDecisions = async (decisions) => {
    if (!supportsIndexedDb()) {
        saveToLocalStorage(decisions);
        return;
    }
    try {
        await saveToIndexedDb(decisions);
    }
    catch {
        saveToLocalStorage(decisions);
    }
};
exports.saveDecisions = saveDecisions;
const applyDecisionsToRows = (rows, decisions) => {
    if (decisions.length === 0) {
        return rows;
    }
    const byVendor = new Map();
    decisions.forEach((decision) => {
        const key = `${decision.vendorAccountKey}::${decision.normalizedName}`;
        const existing = byVendor.get(key) ?? [];
        existing.push(decision);
        byVendor.set(key, existing);
    });
    return rows.map((row) => {
        const key = `${row.vendorAccountKey}::${row.normalizedName}`;
        const options = byVendor.get(key);
        if (!options || options.length === 0) {
            return row;
        }
        const latest = options.reduce((current, next) => Date.parse(next.updatedAt) > Date.parse(current.updatedAt) ? next : current);
        return {
            ...row,
            partnerAccountKey: latest.partnerAccountKey || row.partnerAccountKey,
            status: latest.decision,
        };
    });
};
exports.applyDecisionsToRows = applyDecisionsToRows;
