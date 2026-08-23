"use client";

import { Image as ImageIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";

/** Formats accepted by the picker. */
const ACCEPTED_TYPES = ["image/png", "image/svg+xml"];
const MAX_BYTES = 512 * 1024;

/**
 * Company logo picker with a live preview.
 *
 * The preview is entirely local — the file never leaves the browser, because
 * there is no upload endpoint yet. When one exists it should be a Route
 * Handler that streams to the backend, so the browser still never talks to the
 * API directly.
 *
 * SECURITY NOTE for whoever builds that endpoint: an SVG is a script-bearing
 * document, not just a picture. Accepting one means it must be sanitised
 * server-side (or served from a separate origin with a restrictive CSP) before
 * it is ever rendered back into the admin portal, or a logo upload becomes a
 * stored-XSS vector. The type and size checks below are convenience only —
 * both are trivially bypassed by posting straight to the endpoint.
 */
export function LogoUpload() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Object URLs hold the file in memory until explicitly released.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a PNG or SVG file.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("File must be 512 KB or smaller.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink-soft">Company Logo</p>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-canvas-subtle">
          {previewUrl ? (
            // A plain <img>, not next/image: the source is a local object URL
            // with no known dimensions, which the image optimiser cannot handle.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected company logo preview"
              className="size-full object-contain"
            />
          ) : (
            <ImageIcon aria-hidden className="size-7 text-placeholder" />
          )}
        </div>

        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFile}
            className="sr-only"
            // The visible control is the button below; this input is kept in
            // the DOM (not removed) so it stays reachable and keyboard-operable.
            aria-label="Choose a company logo file"
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Upload New
          </Button>

          <p className="mt-2 text-xs text-muted">
            Recommended: 400×400px PNG or SVG, up to 512 KB.
          </p>

          {fileName ? (
            <p className="mt-1 max-w-64 truncate text-xs text-ink-soft">
              Selected: {fileName}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-1 text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
