"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { RestrictedLink } from "@/components/restricted-link";

export type EmbedProps = {
  src: string;
  title: string;
  restricted?: boolean;
};

export function Embed({ src, title, restricted }: EmbedProps) {
  const type = src.startsWith("http") ? "external" : "internal";
  const link = { label: title, href: src, type, restricted } as const;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-background">
        {restricted ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-foreground/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow">
            <Lock className="h-3 w-3" aria-hidden />
            Restricted
          </span>
        ) : null}
        <iframe
          title={title}
          src={src}
          className="h-full w-full bg-white"
          loading="lazy"
          allowFullScreen
        />
      </div>
      <div className="text-sm text-foreground/70">
        Having trouble with the embedded view?{" "}
        <RestrictedLink link={link}>
          <Link
            href={src}
            target={type === "external" ? "_blank" : undefined}
            rel={type === "external" ? "noreferrer" : undefined}
            className="font-semibold text-primary underline"
          >
            Open in new tab
          </Link>
        </RestrictedLink>
        .
      </div>
    </div>
  );
}
