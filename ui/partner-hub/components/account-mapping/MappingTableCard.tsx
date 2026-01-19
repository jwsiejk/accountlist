"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canonicalFields,
  normalizeMapping,
  validateMapping,
  type RawAccountMapping,
} from "@/lib/account-mapping/schema";

import { INPUT_BASE_CLASSES } from "./constants";

type MappingTableCardProps = {
  title: string;
  headers: string[];
  mapping: RawAccountMapping;
  setMapping: Dispatch<SetStateAction<RawAccountMapping>>;
  validation: ReturnType<typeof validateMapping>;
  visibleFields: Array<(typeof canonicalFields)[number]["key"]>;
  removableFields: Array<(typeof canonicalFields)[number]["key"]>;
  onRemoveField: (fieldKey: (typeof canonicalFields)[number]["key"]) => void;
};

export function MappingTableCard({
  title,
  headers,
  mapping,
  setMapping,
  validation,
  visibleFields,
  removableFields,
  onRemoveField,
}: MappingTableCardProps) {
  const fieldMap = useMemo(
    () => new Map(canonicalFields.map((field) => [field.key, field])),
    [],
  );
  const removableSet = useMemo(() => new Set(removableFields), [removableFields]);

  const visibleFieldConfigs = useMemo(
    () =>
      visibleFields
        .map((fieldKey) => fieldMap.get(fieldKey))
        .filter((field): field is (typeof canonicalFields)[number] => Boolean(field)),
    [fieldMap, visibleFields],
  );

  return (
    <Card className="space-y-4">
      <CardHeader className="gap-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-foreground/60">
          Map uploaded columns to canonical account fields. Unmapped fields are allowed.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3">
          {visibleFieldConfigs.map((field) => {
            const fieldId = `${title.replace(/\s+/g, "-").toLowerCase()}-${field.key}`;
            return (
              <label key={field.key} className="grid gap-1 text-sm" htmlFor={fieldId}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {field.label}
                    {field.required ? <span className="text-destructive"> *</span> : null}
                  </span>
                  {removableSet.has(field.key) ? (
                    <button
                      type="button"
                      className="rounded-full px-1 text-xs text-foreground/50 hover:text-destructive"
                      aria-label={`Remove ${field.label}`}
                      onClick={() => onRemoveField(field.key)}
                    >
                      ✕
                    </button>
                  ) : null}
                </span>
                <select
                  id={fieldId}
                  className={`${INPUT_BASE_CLASSES} w-full`}
                  value={mapping[field.key]}
                  onChange={(event) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                >
                  <option value="">Not mapped</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-foreground/50">{field.description}</span>
              </label>
            );
          })}
        </div>
        {!validation.success && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {validation.error.issues.map((issue) => issue.message).join(" ")} Map required fields
            to continue.
          </div>
        )}
        <div className="text-xs text-foreground/60">
          Selected fields: {Object.values(normalizeMapping(mapping)).filter(Boolean).length}
        </div>
      </CardContent>
    </Card>
  );
}
