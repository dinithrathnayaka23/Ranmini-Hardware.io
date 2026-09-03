"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

import { removeProductImage, uploadProductImage } from "../actions";

/**
 * The product photograph control.
 *
 * <p>This replaced a text field that asked for a path like
 * `/images/products/cement.jpg`. That asked a shopkeeper to know where files
 * live on a server, and it let a saved product point at any address on the
 * origin. Now a picture is chosen from the device and uploaded as bytes the API
 * validates.
 *
 * <p><b>It behaves differently either side of the product existing</b>, because
 * there is nothing to attach a picture to until it does:
 *
 * <ul>
 *   <li><b>Adding:</b> the file is held here and previewed, and the form uploads
 *       it after the product is created. Uploading first would need an id that
 *       does not exist yet, and would leave an orphaned image behind every time
 *       the product was rejected.
 *   <li><b>Editing:</b> the product has an id, so choosing a file uploads it
 *       immediately. Making a photograph wait for the Save button would mean a
 *       picture silently lost whenever somebody chose one and navigated away.
 * </ul>
 *
 * <p>The local preview appears the moment a file is chosen, before anything is
 * uploaded, so somebody can see they picked the right photograph rather than
 * finding out after a round trip.
 */

/** What the API accepts, repeated so the file picker offers the same set. */
const ACCEPTED = "image/png,image/jpeg,image/webp";

/** The API's own ceiling. Checked here only to fail fast and kindly. */
const MAX_BYTES = 1024 * 1024;

export function ProductImageField({
  productId,
  storedUrl,
  onFileChange,
}: {
  /** Null while the product is being created — see the note above. */
  productId: string | null;
  /** The photograph already on file, resolved by `productImageUrl()`. */
  storedUrl: string | null;
  /** Adding only: hands the chosen file to the form, which uploads it. */
  onFileChange?: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: AlertTone; message: string } | null>(
    null,
  );

  // An object URL that is never released leaks for as long as the tab lives.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = async (file: File) => {
    setNotice(null);

    // Both checks are a courtesy — the API checks the type against an allowlist
    // and the bytes against that type's magic number, which is what actually
    // decides. Doing it here saves a shopkeeper on a shop connection from
    // uploading three megabytes to be told no.
    if (!ACCEPTED.split(",").includes(file.type)) {
      setNotice({ tone: "danger", message: "Use a PNG, JPEG or WebP image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setNotice({
        tone: "danger",
        message: "That picture is larger than 1 MB. Choose a smaller one.",
      });
      return;
    }

    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });

    if (!productId) {
      // Adding: the form takes it from here, once the product has an id.
      onFileChange?.(file);
      setNotice({
        tone: "info",
        message: "This photograph will be saved with the product.",
      });
      return;
    }

    setIsBusy(true);
    const data = new FormData();
    data.append("file", file);
    const result = await uploadProductImage(productId, data);
    setIsBusy(false);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    // Dropped either way, but for different reasons. On success the action
    // revalidated the page, so the stored picture is now this one and the local
    // copy would only hide the Remove button. On failure the stored picture is
    // still the real one, and the preview shows something the server refused.
    setPreview(null);
  };

  const handleRemove = async () => {
    if (!productId) {
      setPreview(null);
      onFileChange?.(null);
      setNotice(null);
      return;
    }

    setIsBusy(true);
    const result = await removeProductImage(productId);
    setIsBusy(false);

    setPreview(null);
    setNotice({ tone: result.success ? "success" : "danger", message: result.message });
  };

  const shown = preview ?? storedUrl;

  return (
    <div className="space-y-3">
      {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

      <div className="flex flex-wrap items-center gap-5">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas-subtle">
          {shown ? (
            <Image
              src={shown}
              alt=""
              fill
              sizes="96px"
              // An uploaded picture is served from this origin through a proxy,
              // and a blob: preview is local — neither is a remote host the
              // image optimiser would need configuring for.
              unoptimized={shown.startsWith("blob:")}
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-placeholder">
              <ImageIcon aria-hidden className="size-8" />
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-sm text-muted">
            PNG, JPEG or WebP, up to 1&nbsp;MB. A square photograph looks best —
            the till crops its tiles to a square.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isBusy}
              loadingText="Saving…"
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden className="size-4" />
              {shown ? "Change photograph" : "Add a photograph"}
            </Button>

            {shown ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isBusy}
                onClick={handleRemove}
              >
                <Trash2 aria-hidden className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/*
        Hidden and driven by the button above, because a bare file input cannot
        be styled to match anything else on the page. It stays a real focusable
        input rather than display:none, so the keyboard and assistive technology
        still reach it.
      */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        aria-label="Choose a product photograph"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset first: choosing the same file twice in a row fires no change
          // event otherwise, so a retry after an error would do nothing at all.
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
