import {
  Ban,
  KeyRound,
  PackageMinus,
  PackagePlus,
  Settings,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/format";

import type { AuditAction, AuditPage } from "../types/audit.types";

/**
 * What has been done to the shop's records.
 *
 * <p>A Server Component with no interactivity of its own — the log is a list to
 * read, and its page number lives in the URL like every other listing here.
 * That also keeps it out of the client bundle on a screen nobody visits daily.
 *
 * <p>It sits beneath the Security settings rather than in the navigation rail,
 * because that is where the switch that turns it on lives. A log whose control
 * is on one screen and whose contents are on another invites the owner to turn
 * it on and never look at it.
 */
export function AuditLog({
  log,
  isEnabled,
}: {
  log: AuditPage;
  /** Whether the shop currently has recording switched on. */
  isEnabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <ShieldCheck aria-hidden className="size-[18px] text-brand-600" />
          Activity Log
        </CardTitle>
      </CardHeader>

      <CardBody className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          Voided sales, withdrawn products, and every change to a staff account
          or to these settings. Ordinary work is not recorded — a sale, a stock
          adjustment, a price change — because a log of everything is a log
          nobody reads. Stock movements have their own ledger against each
          product.{" "}
          {isEnabled ? (
            <>Entries are kept for two years, then removed automatically.</>
          ) : (
            <strong className="font-medium text-warning">
              Recording is currently switched off, so nothing new is being added.
            </strong>
          )}
        </p>

        {log.entries.length === 0 ? (
          <p className="rounded-lg border border-line bg-canvas-subtle px-4 py-8 text-center text-sm text-muted">
            {isEnabled
              ? "Nothing recorded yet."
              : "Nothing recorded. Switch the audit log on above to start."}
          </p>
        ) : (
          <ol className="divide-y divide-line rounded-lg border border-line">
            {log.entries.map((entry) => {
              const { Icon, tint } = presentation(entry.action);

              return (
                <li key={entry.id} className="flex gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      tint,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-ink">{entry.summary}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {entry.actorName ?? "System"} ·{" "}
                      <time dateTime={entry.occurredAt}>
                        {formatStamp(entry.occurredAt)}
                      </time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {log.totalPages > 1 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {formatCount(log.totalEntries)} recorded
            </p>
            <Pagination page={log.page} totalPages={log.totalPages} />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

/**
 * The icon and colour for each kind of entry.
 *
 * <p>Colour is a second signal, never the only one: every row says in words
 * what happened, so the tint is there to let somebody scan for the red ones
 * rather than to carry the meaning.
 */
function presentation(action: AuditAction) {
  switch (action) {
    case "SALE_VOIDED":
      return { Icon: Ban, tint: "bg-danger-soft text-danger" };
    case "PRODUCT_WITHDRAWN":
      return { Icon: PackageMinus, tint: "bg-warning-soft text-warning" };
    case "PRODUCT_RESTORED":
      return { Icon: PackagePlus, tint: "bg-success-soft text-success" };
    case "STAFF_CREATED":
      return { Icon: UserPlus, tint: "bg-success-soft text-success" };
    case "STAFF_DEACTIVATED":
      return { Icon: UserMinus, tint: "bg-danger-soft text-danger" };
    case "STAFF_REACTIVATED":
      return { Icon: UserPlus, tint: "bg-success-soft text-success" };
    case "STAFF_ROLE_CHANGED":
      return { Icon: ShieldCheck, tint: "bg-warning-soft text-warning" };
    case "STAFF_PASSWORD_RESET":
      return { Icon: KeyRound, tint: "bg-warning-soft text-warning" };
    case "SETTINGS_CHANGED":
      return { Icon: Settings, tint: "bg-canvas-subtle text-ink-soft" };
  }
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
