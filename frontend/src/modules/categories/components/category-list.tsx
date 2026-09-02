"use client";

import { ArrowDown, ArrowUp, Archive, Network, Pencil } from "lucide-react";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/text-field";
import { cn } from "@/shared/lib/cn";

import {
  deactivateCategory,
  moveCategory,
  renameCategory,
  type CategoryActionResult,
} from "../actions";
import { categoryNameSchema } from "../schemas/category.schema";
import type { Category } from "../types/category.types";

interface Notice {
  tone: AlertTone;
  message: string;
}

/**
 * The shop's categories, in the order the till shows them.
 *
 * <p>One notice for the whole list rather than one per row. A retired category
 * disappears from the list the moment it is retired, so a message living inside
 * its own row would unmount before it could be read — and five stacked alerts
 * in a list this short would be noise anyway.
 */
export function CategoryList({ categories }: { categories: Category[] }) {
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const report = React.useCallback((result: CategoryActionResult) => {
    setNotice({ tone: result.success ? "success" : "danger", message: result.message });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Network aria-hidden className="size-[18px] text-brand-600" />
          Categories
        </CardTitle>
        <span className="shrink-0 text-xs text-muted">
          {categories.length === 1 ? "1 category" : `${categories.length} categories`}
        </span>
      </CardHeader>

      {notice ? (
        <div className="border-b border-line p-4">
          <Alert tone={notice.tone} message={notice.message} />
        </div>
      ) : null}

      {categories.length === 0 ? (
        <CardBody>
          <p className="text-sm leading-relaxed text-muted">
            No categories yet. Add the first one with the form beside this — a
            product cannot be created until there is at least one to file it
            under.
          </p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-line">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              position={index + 1}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              onResult={report}
              onBusy={() => setNotice(null)}
            />
          ))}
        </ul>
      )}

      <div className="border-t border-line px-5 py-4">
        <p className="text-xs leading-relaxed text-muted">
          The order above is the order of the filter buttons at the till.
          Renaming a category updates every product filed under it; its
          permanent identifier, shown in grey, never changes.
        </p>
      </div>
    </Card>
  );
}

/** What the row is currently waiting on, or null when it is idle. */
type Pending = "rename" | "move" | "retire" | null;

function CategoryRow({
  category,
  position,
  isFirst,
  isLast,
  onResult,
  onBusy,
}: {
  category: Category;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onResult: (result: CategoryActionResult) => void;
  onBusy: () => void;
}) {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(category.name);
  const [isConfirmingRetire, setIsConfirmingRetire] = React.useState(false);
  const [pending, setPending] = React.useState<Pending>(null);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  const isBusy = pending !== null;

  const startRenaming = () => {
    // Seeded from the current name each time the editor opens, so an abandoned
    // edit does not reappear the next time somebody clicks Rename.
    setDraft(category.name);
    setFieldError(null);
    setIsConfirmingRetire(false);
    setIsRenaming(true);
  };

  const saveRename = async () => {
    const parsed = categoryNameSchema.safeParse(draft);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message);
      return;
    }

    // Nothing to save, so nothing to report — just close the editor.
    if (parsed.data === category.name) {
      setIsRenaming(false);
      return;
    }

    onBusy();
    setPending("rename");
    const result = await renameCategory(category.id, parsed.data);
    setPending(null);

    onResult(result);
    if (result.success) setIsRenaming(false);
  };

  const move = async (direction: "up" | "down") => {
    onBusy();
    setPending("move");
    const result = await moveCategory(category.id, direction);
    setPending(null);

    // A successful move speaks for itself: the row visibly changes place. Only
    // a failure is worth a line of text.
    if (!result.success) onResult(result);
  };

  const retire = async () => {
    onBusy();
    setPending("retire");
    const result = await deactivateCategory(category.id);
    setPending(null);

    onResult(result);
    setIsConfirmingRetire(false);
  };

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-canvas-subtle text-xs font-medium text-muted tabular-nums"
          >
            {position}
          </span>

          {isRenaming ? (
            <div className="min-w-0 flex-1">
              <TextField
                label={`New name for ${category.name}`}
                value={draft}
                autoFocus
                autoComplete="off"
                maxLength={80}
                error={fieldError ?? undefined}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setFieldError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveRename();
                  }
                  if (event.key === "Escape") setIsRenaming(false);
                }}
              />
            </div>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{category.name}</p>
              <p className="truncate text-xs text-muted">{category.slug}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {isRenaming ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={isBusy}
                onClick={() => setIsRenaming(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={pending === "rename"}
                loadingText="Saving…"
                onClick={saveRename}
              >
                Save name
              </Button>
            </>
          ) : isConfirmingRetire ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={isBusy}
                onClick={() => setIsConfirmingRetire(false)}
              >
                Keep it
              </Button>
              <Button
                size="sm"
                isLoading={pending === "retire"}
                loadingText="Retiring…"
                onClick={retire}
                className="bg-danger hover:bg-danger/90"
              >
                <Archive aria-hidden className="size-4" />
                Confirm retire
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <IconAction
                  label={`Move ${category.name} up`}
                  icon={ArrowUp}
                  disabled={isFirst || isBusy}
                  onClick={() => void move("up")}
                />
                <IconAction
                  label={`Move ${category.name} down`}
                  icon={ArrowDown}
                  disabled={isLast || isBusy}
                  onClick={() => void move("down")}
                />
              </div>

              <Button variant="secondary" size="sm" disabled={isBusy} onClick={startRenaming}>
                <Pencil aria-hidden className="size-4" />
                Rename
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={isBusy}
                onClick={() => setIsConfirmingRetire(true)}
              >
                <Archive aria-hidden className="size-4" />
                Retire
              </Button>
            </>
          )}
        </div>
      </div>

      {isConfirmingRetire ? (
        <p className="mt-3 rounded-lg border border-line bg-canvas-subtle p-3 text-xs leading-relaxed text-ink-soft">
          <strong className="font-medium text-ink">{category.name}</strong> will
          disappear from the till&apos;s filter buttons and from the category
          list here. Its products stay on sale and keep the name on their
          records, and past sales are untouched — but this screen cannot bring
          the category back afterwards. You would have to create it again.
        </p>
      ) : null}
    </li>
  );
}

/**
 * A compact square button for the reordering arrows.
 *
 * <p>The accessible name includes the category, so a screen-reader user hears
 * which row an arrow belongs to instead of a column of identical "Move up".
 */
function IconAction({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof ArrowUp;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-line text-muted transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-line-strong hover:bg-canvas-subtle hover:text-ink",
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}
