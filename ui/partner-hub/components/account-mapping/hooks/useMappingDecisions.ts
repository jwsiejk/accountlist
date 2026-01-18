"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildDecisionKey,
  loadDecisions,
  saveDecisions,
  type MappingDecision,
  type MappingDecisionStatus,
} from "@/lib/account-mapping/decisionStore";

import type { AccountRecord, ReviewRow } from "../types";

export const useMappingDecisions = () => {
  const [decisions, setDecisions] = useState<MappingDecision[]>([]);
  const decisionsLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    loadDecisions().then((stored) => {
      if (!isMounted) {
        return;
      }
      setDecisions(stored);
      decisionsLoadedRef.current = true;
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!decisionsLoadedRef.current) {
      return;
    }
    void saveDecisions(decisions);
  }, [decisions]);

  const handleDecision = useCallback(
    (row: ReviewRow, decision: MappingDecisionStatus, partnerOverride?: AccountRecord | null) => {
      const partnerKey =
        partnerOverride?.accountKey ?? row.partner?.accountKey ?? row.partnerAccountKey ?? "";
      const decisionEntry: MappingDecision = {
        key: buildDecisionKey(row.vendorAccountKey, partnerKey, row.normalizedName),
        vendorAccountKey: row.vendorAccountKey,
        partnerAccountKey: partnerKey,
        normalizedName: row.normalizedName,
        decision,
        updatedAt: new Date().toISOString(),
      };

      setDecisions((prev) => {
        const existingIndex = prev.findIndex((item) => item.key === decisionEntry.key);
        if (existingIndex === -1) {
          return [decisionEntry, ...prev];
        }
        const next = [...prev];
        next[existingIndex] = decisionEntry;
        return next;
      });
    },
    [],
  );

  return {
    decisions,
    setDecisions,
    buildDecisionKey,
    handleDecision,
  };
};
