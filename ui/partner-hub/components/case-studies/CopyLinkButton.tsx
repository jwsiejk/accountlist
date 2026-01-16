"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

const copiedResetDelayMs = 1500;

export function CopyLinkButton() {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleCopy = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator?.clipboard?.writeText) return;

    const origin = window.location.origin;
    const url = `${origin}${pathname ?? ""}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, copiedResetDelayMs);
    } catch {
      // Fail silently if clipboard access is denied.
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      className="w-full justify-center"
      aria-label={copied ? "Link copied" : "Copy link"}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
