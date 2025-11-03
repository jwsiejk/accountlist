"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type RestrictedTarget = {
  label: string;
  href: string;
  type: "internal" | "external";
  restricted?: boolean;
};

type RestrictedLinkProps = {
  link: RestrictedTarget;
  children: React.ReactElement;
};

export function RestrictedLink({ link, children }: RestrictedLinkProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const child = React.Children.only(children);

  if (!link.restricted) {
    return child;
  }

  const handleOpenAnyway = () => {
    setConfirmed(true);
    setOpen(false);
    window.location.assign(link.href);
  };

  const wrappedChild = React.cloneElement(child, {
    ...child.props,
    onClick: (event: React.MouseEvent) => {
      child.props.onClick?.(event);
      if (!event.defaultPrevented && !confirmed) {
        event.preventDefault();
        setOpen(true);
      }
    },
  });

  return (
    <>
      <div className="relative">
        {wrappedChild}
        <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
          <Lock className="h-3 w-3" aria-hidden />
          Restricted
        </span>
      </div>
      {open ? (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-lg">
            <h2 className="text-sm font-semibold">Restricted link — request access?</h2>
            <p className="mt-2 text-sm text-foreground/70">You might need additional permissions before continuing.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleOpenAnyway}>Open anyway</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
