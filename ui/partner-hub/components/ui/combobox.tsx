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

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOptionInput[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
};

const normalizeValue = (value: string) => value.trim().toLowerCase();

export type { ComboboxOption } from "./comboboxUtils";

export const Combobox = ({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel = "No matches",
  disabled = false,
}: ComboboxProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const normalizedOptions = useMemo(
    () => options.map((option) => toComboboxOption(option)),
    [options],
  );

  useEffect(() => {
    if (!isOpen) {
      setInputValue(value);
      setHighlightedIndex(null);
    }
  }, [value, isOpen]);

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
    if (!inputValue) {
      return normalizedOptions;
    }
    const normalizedInput = normalizeValue(inputValue);
    return normalizedOptions.filter((option) => {
      const normalizedValue = normalizeValue(option.value);
      if (normalizedValue.includes(normalizedInput)) {
        return true;
      }
      if (option.label) {
        return normalizeValue(option.label).includes(normalizedInput);
      }
      return false;
    });
  }, [inputValue, normalizedOptions]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
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
        const nextIndex =
          current === null ? filteredOptions.length - 1 : current - 1;
        return Math.max(nextIndex, 0);
      });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
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
        {value && !disabled ? (
          <button
            type="button"
            className="text-xs font-semibold text-foreground/60 hover:text-foreground"
            onClick={() => {
              setInputValue("");
              onChange("");
              setIsOpen(false);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {isOpen && !disabled ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-foreground/10 bg-background shadow-lg">
          <ul className="max-h-48 overflow-auto py-1 text-sm">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-foreground/50">
                {emptyLabel}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isHighlighted = highlightedIndex === index;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2 text-left ${
                        isHighlighted ? "bg-primary/10 text-primary" : ""
                      }`}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelect(option.value);
                      }}
                    >
                      {formatComboboxOptionLabel(option)}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
