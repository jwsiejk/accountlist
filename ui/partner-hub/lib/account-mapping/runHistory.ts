import type { RawAccountMapping } from "./schema";
import type { MappingDecision } from "./decisionStore";

const DB_NAME = "account-mapping-history";
const STORE_NAME = "runs";
const DB_VERSION = 1;

export type StoredCsvSnapshot = {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  inferredDelimiter: string;
};

export type MatchPairSnapshot = {
  vendorAccountKey: string;
  partnerAccountKey: string;
};

export type AccountMappingRun = {
  runId: string;
  timestamp: string;
  vendorFileName: string;
  partnerFileName: string;
  rowCounts: {
    vendor: number;
    partner: number;
    matches: number;
    targets: number;
  };
  templateName?: string;
  templateId?: string;
  vendorMapping: RawAccountMapping;
  partnerMapping: RawAccountMapping;
  vendorSnapshot: StoredCsvSnapshot;
  partnerSnapshot: StoredCsvSnapshot;
  decisions: MappingDecision[];
  matchPairs: MatchPairSnapshot[];
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "runId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });

export const saveRun = async (run: AccountMappingRun): Promise<void> => {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(run);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to save run"));
  });
  db.close();
};

export const loadRuns = async (): Promise<AccountMappingRun[]> => {
  const db = await openDatabase();
  const runs = await new Promise<AccountMappingRun[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as AccountMappingRun[]);
    request.onerror = () => reject(request.error ?? new Error("Failed to load runs"));
  });
  db.close();
  return runs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
};

export const findLatestRunByFiles = (
  runs: AccountMappingRun[],
  vendorFileName: string,
  partnerFileName: string,
  excludeRunId?: string,
): AccountMappingRun | undefined =>
  runs.find(
    (run) =>
      run.vendorFileName === vendorFileName &&
      run.partnerFileName === partnerFileName &&
      run.runId !== excludeRunId,
  );
