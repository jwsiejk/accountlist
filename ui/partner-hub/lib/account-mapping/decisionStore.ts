export type MappingDecisionStatus = "confirmed" | "rejected" | "manual";
export type ReviewRowStatus = "autoMatch" | "review" | "unmatched" | MappingDecisionStatus;

export type MappingDecision = {
  key: string;
  vendorAccountKey: string;
  partnerAccountKey: string;
  normalizedName: string;
  decision: MappingDecisionStatus;
  updatedAt: string;
};

export type DecisionRowBase = {
  vendorAccountKey: string;
  normalizedName: string;
  partnerAccountKey: string | null;
  status: ReviewRowStatus;
};

type DecisionStorePayload = {
  version: number;
  decisions: MappingDecision[];
};

const STORAGE_VERSION = 1;
const STORAGE_KEY = "partner-hub:account-mapping:decisions";
const DB_NAME = "partner-hub-account-mapping";
const STORE_NAME = "decision-store";
const STORE_KEY = "all";

export const buildDecisionKey = (
  vendorAccountKey: string,
  partnerAccountKey: string,
  normalizedName: string,
) => `${vendorAccountKey}::${partnerAccountKey}::${normalizedName}`;

const isDecision = (value: unknown): value is MappingDecision => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const decision = value as MappingDecision;
  return (
    typeof decision.key === "string" &&
    typeof decision.vendorAccountKey === "string" &&
    typeof decision.partnerAccountKey === "string" &&
    typeof decision.normalizedName === "string" &&
    typeof decision.decision === "string" &&
    typeof decision.updatedAt === "string"
  );
};

export const serializeDecisions = (decisions: MappingDecision[]) =>
  JSON.stringify({
    version: STORAGE_VERSION,
    decisions,
  } satisfies DecisionStorePayload);

export const deserializeDecisions = (raw: string | null): MappingDecision[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as DecisionStorePayload;
    if (!parsed || typeof parsed !== "object") {
      return [];
    }
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.decisions)) {
      return [];
    }
    return parsed.decisions.filter(isDecision);
  } catch {
    return [];
  }
};

const openDecisionDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
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

const loadFromIndexedDb = async (): Promise<MappingDecision[]> => {
  const db = await openDecisionDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STORE_KEY);
    request.onsuccess = () => {
      const result = request.result as { decisions?: MappingDecision[] } | undefined;
      resolve(Array.isArray(result?.decisions) ? result?.decisions ?? [] : []);
    };
    request.onerror = () => resolve([]);
  });
};

const saveToIndexedDb = async (decisions: MappingDecision[]): Promise<void> => {
  const db = await openDecisionDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: STORE_KEY, decisions });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};

const loadFromLocalStorage = (): MappingDecision[] => {
  if (typeof window === "undefined") {
    return [];
  }
  return deserializeDecisions(window.localStorage.getItem(STORAGE_KEY));
};

const saveToLocalStorage = (decisions: MappingDecision[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, serializeDecisions(decisions));
};

const supportsIndexedDb = () => typeof indexedDB !== "undefined";

export const loadDecisions = async (): Promise<MappingDecision[]> => {
  if (!supportsIndexedDb()) {
    return loadFromLocalStorage();
  }

  try {
    return await loadFromIndexedDb();
  } catch {
    return loadFromLocalStorage();
  }
};

export const saveDecisions = async (decisions: MappingDecision[]): Promise<void> => {
  if (!supportsIndexedDb()) {
    saveToLocalStorage(decisions);
    return;
  }

  try {
    await saveToIndexedDb(decisions);
  } catch {
    saveToLocalStorage(decisions);
  }
};

export const applyDecisionsToRows = <T extends DecisionRowBase>(
  rows: T[],
  decisions: MappingDecision[],
): T[] => {
  if (decisions.length === 0) {
    return rows;
  }

  const byVendor = new Map<string, MappingDecision[]>();

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

    const latest = options.reduce((current, next) =>
      Date.parse(next.updatedAt) > Date.parse(current.updatedAt) ? next : current,
    );

    return {
      ...row,
      partnerAccountKey: latest.partnerAccountKey || row.partnerAccountKey,
      status: latest.decision,
    };
  });
};
