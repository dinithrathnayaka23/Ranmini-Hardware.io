"use client";

import { AtSign, IdCard, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Avatar } from "@/shared/components/ui/avatar";
import { routes } from "@/shared/config/app.config";

import { placeholderAdmin } from "../constants/placeholder-session";

/**
 * Signed-in administrator control in the top bar.
 *
 * The avatar is the button; clicking it reveals who is signed in and how to
 * reach their settings. Deliberately a plain popover rather than `role="menu"`:
 * most of what it shows is static detail, and announcing static text as menu
 * items misrepresents it to a screen reader.
 */
export function AdminMenu() {
  const admin = placeholderAdmin;
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();
  const pathname = usePathname();

  // Navigating away should dismiss the popover, or it would hang over the page
  // the user just asked for.
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      // Escape should hand focus back to what opened the popover, otherwise a
      // keyboard user is dropped at the top of the document.
      triggerRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        // The accessible name carries the person's name, so the control is not
        // announced as an unlabelled image button.
        aria-label={`Account menu for ${admin.fullName}`}
        className="inline-flex size-10 items-center justify-center rounded-full transition-shadow hover:ring-2 hover:ring-line aria-expanded:ring-2 aria-expanded:ring-brand-600/30"
      >
        <Avatar fullName={admin.fullName} imageUrl={admin.avatarUrl} size={36} />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar
              fullName={admin.fullName}
              imageUrl={admin.avatarUrl}
              size={44}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {admin.fullName}
              </p>
              <p className="truncate text-xs text-muted">{admin.role}</p>
            </div>
          </div>

          <dl className="space-y-3 p-4">
            <DetailRow icon={IdCard} label="Username" value={admin.username} />
            <DetailRow icon={AtSign} label="Email" value={admin.email} />
            <DetailRow
              icon={ShieldCheck}
              label="Access"
              value="Full administrator"
            />
          </dl>

          <div className="border-t border-line p-2">
            <Link
              href={routes.adminSettings}
              className="block rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-canvas-subtle hover:text-ink"
            >
              System settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-placeholder" />
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        {/* `break-words`: an email has no spaces to wrap on and would otherwise
            push the popover wider than its own box. */}
        <dd className="text-sm break-words text-ink">{value}</dd>
      </div>
    </div>
  );
}
