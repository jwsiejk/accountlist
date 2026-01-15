"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  formatComboboxOptionLabel,
  toComboboxOption,
  type ComboboxOption,
  type ComboboxOptionInput,
} from "./comboboxUtils";

const INPUT_BASE_CLASSES =
  "h-10 rounded-lg border border-border/70 bg-background px-3 text-sm text-foreground shadow-sm transition placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const DEFAULT_MAX_VISIBLE_OPTIONS = 300;

type MultiComboboxProps = {
  values: string[];
  onChange: (values: string[]) => void;
  options: ComboboxOptionInput[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  maxVisibleOptions?: number;
};

const normalizeValue = (value: string) => value.trim().toLowerCase();

export const MultiCombobox = ({
  values,
  onChange,
  options,
  placeholder,
  emptyLabel = "No matches",
  disabled = false,
  maxVisibleOptions = DEFAULT_MAX_VISIBLE_OPTIONS,
}: MultiComboboxProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const normalizedOptions = useMemo(
    () => options.map((option) => toComboboxOption(option)),
    [options],
  );

  const selectedSet = useMemo(() => {
    return new Set(values.map((value) => normalizeValue(value)));
  }, [values]);

  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
      setHighlightedIndex(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const normalizedInput = normalizeValue(inputValue);
    const baseOptions = normalizedInput
      ? normalizedOptions.filter((option) => {
          const normalizedValue = normalizeValue(option.value);
          if (normalizedValue.includes(normalizedInput)) {
            return true;
          }
          if (option.label) {
            return normalizeValue(option.label).includes(normalizedInput);
          }
          return false;
        })
      : normalizedOptions;

    if (!normalizedInput && baseOptions.length > maxVisibleOptions) {
      return baseOptions.slice(0, maxVisibleOptions);
    }
    return baseOptions;
  }, [inputValue, maxVisibleOptions, normalizedOptions]);

  const handleSelect = (nextValue: string) => {
    if (selectedSet.has(normalizeValue(nextValue))) {
      return;
    }
    onChange([...values, nextValue]);
    setInputValue("");
    setHighlightedIndex(null);
    setIsOpen(true);
  };

  const handleRemove = (valueToRemove: string) => {
    onChange(values.filter((value) => normalizeValue(value) !== normalizeValue(valueToRemove)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(0);
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex !== null) {
        const option = filteredOptions[highlightedIndex];
        if (option) {
          handleSelect(option.value);
        }
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => {
        const nextIndex = current === null ? 0 : current + 1;
        return Math.min(nextIndex, filteredOptions.length - 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => {
        const nextIndex = current === null ? filteredOptions.length - 1 : current - 1;
        return Math.max(nextIndex, 0);
      });
    }
  };

  const showLimitHint =
    !inputValue && normalizedOptions.length > maxVisibleOptions && filteredOptions.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <div className="space-y-2">
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-1 text-xs text-foreground/80"
              >
                <span className="max-w-[220px] truncate">{value}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="text-foreground/60 hover:text-foreground"
                    onClick={() => handleRemove(value)}
                    aria-label={`Remove ${value}`}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            className={`w-full ${INPUT_BASE_CLASSES}`}
            placeholder={placeholder}
            value={inputValue}
            disabled={disabled}
            onChange={(event) => {
              setInputValue(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
          />
          {values.length > 0 && !disabled ? (
            <button
              type="button"
              className="text-xs font-semibold text-foreground/60 hover:text-foreground"
              onClick={() => {
                setInputValue("");
                onChange([]);
                setIsOpen(false);
              }}
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>
      {isOpen && !disabled ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-foreground/10 bg-background shadow-lg">
          <ul className="max-h-56 overflow-auto py-1 text-sm">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-foreground/50">{emptyLabel}</li>
            ) : (
              filteredOptions.map((option, index) => {
                const isHighlighted = highlightedIndex === index;
                const isSelected = selectedSet.has(normalizeValue(option.value));
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-left ${
                        isHighlighted ? "bg-primary/10 text-primary" : ""
                      } ${isSelected ? "text-foreground/50" : ""}`}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelect(option.value);
                      }}
                      disabled={isSelected}
                    >
                      <span>{formatComboboxOptionLabel(option)}</span>
                      {isSelected ? <span className="text-xs">Selected</span> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {showLimitHint ? (
            <div className="border-t border-foreground/10 px-3 py-2 text-xs text-foreground/50">
              Showing first {maxVisibleOptions} accounts. Type to refine.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export type { ComboboxOption } from "./comboboxUtils";
