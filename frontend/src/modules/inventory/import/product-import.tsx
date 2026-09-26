"use client";

import {
  CircleCheck,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import * as React from "react";

import { Alert } from "@/shared/components/ui/alert";
import { Button, ButtonLink } from "@/shared/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { FileDropzone } from "@/shared/components/ui/file-dropzone";
import { routes } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/format";

import {
  MAX_IMPORT_BYTES,
  type ImportJob,
  type ImportPreview,
  type ImportRowError,
} from "./import.types";

const TEMPLATE_URL = "/templates/product-import-template.csv";

/** How often a running import is checked on. */
const POLL_MS = 1000;

type Step =
  | { kind: "choose" }
  | { kind: "checking"; file: File }
  | { kind: "preview"; file: File; preview: ImportPreview }
  | { kind: "importing"; file: File; job: ImportJob }
  | { kind: "finished"; job: ImportJob };

/**
 * Adding and updating products in bulk from a spreadsheet.
 *
 * <p><b>Nothing is written until the owner has seen what will happen.</b>
 * Choosing a file only checks it: the screen then says how many products are
 * new, how many update existing ones, which categories will be created, and
 * exactly which lines are wrong and why. Only the button under that summary
 * writes anything.
 *
 * <p>The import itself runs in the background on the server and this screen
 * watches it, so a thirty-thousand-line file shows steady progress instead of a
 * page that appears frozen — and navigating away does not stop it.
 */
export function ProductImport() {
  const [step, setStep] = React.useState<Step>({ kind: "choose" });
  const [error, setError] = React.useState<string | null>(null);

  const check = async (file: File) => {
    setError(null);
    setStep({ kind: "checking", file });
    try {
      const preview = await send<ImportPreview>("/api/inventory/import/preview", file);
      setStep({ kind: "preview", file, preview });
    } catch (cause) {
      setError(messageOf(cause));
      setStep({ kind: "choose" });
    }
  };

  const start = async (file: File) => {
    setError(null);
    try {
      const job = await send<ImportJob>("/api/inventory/import", file);
      setStep({ kind: "importing", file, job });
    } catch (cause) {
      setError(messageOf(cause));
    }
  };

  // Watch a running import until it finishes.
  const jobId = step.kind === "importing" ? step.job.id : null;
  React.useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/inventory/import/${jobId}`, { cache: "no-store" });
        if (!response.ok) throw new Error((await readMessage(response)) ?? "Lost track of the import.");
        const job = (await response.json()) as ImportJob;
        if (cancelled) return;
        if (job.state === "DONE" || job.state === "FAILED") setStep({ kind: "finished", job });
        else setStep((current) => (current.kind === "importing" ? { ...current, job } : current));
      } catch (cause) {
        // A dropped poll is not a failed import; the next one tries again.
        if (!cancelled) setError(messageOf(cause));
      }
    };

    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId]);

  const reset = () => {
    setError(null);
    setStep({ kind: "choose" });
  };

  return (
    <div className="space-y-5">
      {error ? <Alert message={error} /> : null}

      {step.kind === "choose" || step.kind === "checking" ? (
        <ChooseFile
          isChecking={step.kind === "checking"}
          onFile={(file) => void check(file)}
          onReject={setError}
        />
      ) : null}

      {step.kind === "preview" ? (
        <PreviewCard
          file={step.file}
          preview={step.preview}
          onImport={() => void start(step.file)}
          onReset={reset}
        />
      ) : null}

      {step.kind === "importing" ? <ProgressCard job={step.job} /> : null}

      {step.kind === "finished" ? <FinishedCard job={step.job} onReset={reset} /> : null}
    </div>
  );
}

function ChooseFile({
  isChecking,
  onFile,
  onReject,
}: {
  isChecking: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <FileSpreadsheet aria-hidden className="size-[18px] text-brand-600" />
          Choose a spreadsheet
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <p className="text-sm leading-relaxed text-muted">
          Save your spreadsheet as <span className="font-medium text-ink">CSV</span> (in Excel:
          File → Save As → CSV UTF-8). Each row is a product. A SKU already in the catalogue
          updates that product; a new SKU adds one. Choosing a file only checks it — nothing
          changes until you confirm.
        </p>

        <FileDropzone
          accept={{ "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"], "text/plain": [".csv"] }}
          maxSize={MAX_IMPORT_BYTES}
          onFile={onFile}
          onReject={onReject}
          isBusy={isChecking}
          icon={FileUp}
          typeMessage="Choose a .csv file. In Excel, use File → Save As → CSV UTF-8."
          label="Choose a spreadsheet to import"
          title={isChecking ? "Checking the file" : "Drop a CSV file here"}
          hint="CSV · up to 12 MB · about 50,000 products"
        />

        <div className="grid gap-4 rounded-lg border border-line bg-canvas-subtle p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-1">
            <p className="font-medium text-ink">Columns</p>
            <p className="leading-relaxed text-muted">
              Required: <b className="font-medium text-ink-soft">SKU, Name, Category, Buying Price, Selling Price</b>.
              Optional: Brand, Unit, Stock, Reorder Level. New categories are created for you.
              Stock is used only for new products — existing stock is changed with a stock adjustment.
            </p>
          </div>
          <ButtonLink href={TEMPLATE_URL} variant="secondary" size="sm" download>
            <Download aria-hidden className="size-4" />
            Download template
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}

function PreviewCard({
  file,
  preview,
  onImport,
  onReset,
}: {
  file: File;
  preview: ImportPreview;
  onImport: () => void;
  onReset: () => void;
}) {
  const [isStarting, setIsStarting] = React.useState(false);
  // Unchanged rows need no writing, so the button counts only real changes.
  const importable = preview.toCreate + preview.toUpdate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <FileSpreadsheet aria-hidden className="size-[18px] text-brand-600" />
          Check before importing
        </CardTitle>
        <span className="truncate text-xs text-muted">{file.name}</span>
      </CardHeader>
      <CardBody className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Will be added" value={preview.toCreate} tone="success" />
          <Figure label="Will be updated" value={preview.toUpdate} tone="brand" />
          <Figure label="Unchanged" value={preview.unchanged} tone="neutral" />
          <Figure label="Rows skipped" value={preview.skipped} tone={preview.skipped > 0 ? "warning" : "neutral"} />
        </dl>

        {preview.newCategories.length > 0 ? (
          <div className="text-sm">
            <p className="font-medium text-ink">Categories that will be created</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {preview.newCategories.map((name) => (
                <li key={name} className="rounded-full bg-canvas-subtle px-3 py-1 text-xs text-ink-soft">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview.skipped > 0 ? <ErrorList errors={preview.errors} total={preview.skipped} /> : null}

        {preview.toUpdate > 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            Updating replaces the name, brand, category, unit, prices and reorder level of existing
            products with the values in the file. Their stock is not changed.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <Button
            size="md"
            disabled={importable === 0}
            isLoading={isStarting}
            loadingText="Starting…"
            onClick={() => {
              setIsStarting(true);
              onImport();
            }}
          >
            <FileUp aria-hidden className="size-4" />
            {importable === 0
              ? "Nothing to import"
              : `Import ${formatCount(importable)} product${importable === 1 ? "" : "s"}`}
          </Button>
          <Button size="md" variant="secondary" onClick={onReset} disabled={isStarting}>
            <RotateCcw aria-hidden className="size-4" />
            Choose a different file
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ProgressCard({ job }: { job: ImportJob }) {
  const percent = job.total === 0 ? 0 : Math.round((job.processed / job.total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Loader2 aria-hidden className="size-[18px] animate-spin text-brand-600" />
          Importing
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div
          role="progressbar"
          aria-label="Import progress"
          aria-valuemin={0}
          aria-valuemax={job.total}
          aria-valuenow={job.processed}
          className="h-2.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-ink-soft tabular-nums">
          {formatCount(job.processed)} of {formatCount(job.total)} products · {percent}%
        </p>
        <p className="text-xs leading-relaxed text-muted">
          This runs on the server. You can leave this page; the import carries on, and the
          products appear in the inventory as each batch is saved.
        </p>
      </CardBody>
    </Card>
  );
}

function FinishedCard({ job, onReset }: { job: ImportJob; onReset: () => void }) {
  const failed = job.state === "FAILED";

  return (
    <Card>
      <CardHeader tone={failed ? "danger" : "default"}>
        <CardTitle className={failed ? "text-danger" : undefined}>
          {failed ? (
            <TriangleAlert aria-hidden className="size-[18px]" />
          ) : (
            <CircleCheck aria-hidden className="size-[18px] text-success" />
          )}
          {failed ? "Import stopped" : "Import complete"}
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {failed && job.failure ? <Alert message={job.failure} /> : null}

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Added" value={job.created} tone="success" />
          <Figure label="Updated" value={job.updated} tone="brand" />
          <Figure label="Unchanged" value={job.unchanged} tone="neutral" />
          <Figure label="Skipped" value={job.skipped} tone={job.skipped > 0 ? "warning" : "neutral"} />
        </dl>

        {job.categoriesCreated.length > 0 ? (
          <p className="text-sm text-ink-soft">
            New categories: <span className="font-medium text-ink">{job.categoriesCreated.join(", ")}</span>
          </p>
        ) : null}

        {job.conflicts.length > 0 ? (
          <ErrorList errors={job.conflicts} total={job.conflicts.length} title="Rows added by someone else meanwhile" />
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <ButtonLink href={routes.adminInventory} size="md">
            View inventory
          </ButtonLink>
          <Button size="md" variant="secondary" onClick={onReset}>
            <FileUp aria-hidden className="size-4" />
            Import another file
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "brand" | "warning" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight tabular-nums",
          tone === "success" && "text-success",
          tone === "brand" && "text-brand-600",
          tone === "warning" && "text-warning",
          tone === "neutral" && "text-ink",
        )}
      >
        {formatCount(value)}
      </dd>
    </div>
  );
}

/**
 * The rows that cannot be imported, by line number.
 *
 * <p>Line numbers count the heading as line 1 — the same numbers the spreadsheet
 * shows down its left edge, so the owner can go straight to the row.
 */
function ErrorList({
  errors,
  total,
  title = "Rows that will be skipped",
}: {
  errors: ImportRowError[];
  total: number;
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-warning/30">
      <div className="flex items-center justify-between gap-3 border-b border-warning/20 bg-warning-soft px-4 py-2.5">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-muted">
          {total > errors.length ? `First ${errors.length} of ${formatCount(total)}` : `${total}`}
        </p>
      </div>
      <ul className="scroll-slim max-h-64 divide-y divide-line overflow-y-auto">
        {errors.map((error) => (
          <li key={`${error.line}-${error.message}`} className="flex gap-4 px-4 py-2 text-sm">
            <span className="w-16 shrink-0 text-muted tabular-nums">Line {error.line}</span>
            <span className="min-w-0 text-ink-soft">{error.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function send<T>(url: string, file: File): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: file,
  });
  if (!response.ok) {
    throw new Error((await readMessage(response)) ?? "The file could not be processed.");
  }
  return (await response.json()) as T;
}

async function readMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" ? body.message : null;
  } catch {
    return null;
  }
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Something went wrong. Try again.";
}
