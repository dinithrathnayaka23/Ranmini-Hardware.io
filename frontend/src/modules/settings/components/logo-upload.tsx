"use client";

import { Image as ImageIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { FileDropzone } from "@/shared/components/ui/file-dropzone";
import { shopLogoUrl } from "@/shared/lib/shop-logo-url";

import { removeShopLogo, uploadShopLogo } from "../actions";

/**
 * Formats the picker offers.
 *
 * <p><b>SVG is deliberately absent</b>, and it used to be here. An SVG is a
 * script-bearing document, not just a picture, and this image is rendered back
 * into the administrator's own portal — accepting one would turn the logo
 * picker into stored cross-site scripting aimed at the person most worth
 * attacking. The API refuses it for the same reason, which is the check that
 * actually decides; this list only spares the owner a rejected upload.
 */
const ACCEPTED_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

/** Matches the API's own ceiling, so the picker refuses what it would refuse. */
const MAX_BYTES = 512 * 1024;

/**
 * The shop's logo, uploaded and stored.
 *
 * <p>Until now this was a picker with a preview and nothing behind it — the
 * file never left the browser, because there was no endpoint to send it to. The
 * owner would choose a logo, see it appear, and find it gone on the next page
 * load. It now uploads, and what it uploads is printed on receipts when
 * Settings → Receipts has the logo switched on.
 *
 * <p>The upload is immediate rather than deferred to the form's Save button.
 * The rest of this screen is text fields that submit together; an image is a
 * different kind of change, and a picture that appeared on screen but needed a
 * separate save to persist is exactly the confusion the old version created.
 */
export function LogoUpload({
  logoUpdatedAt,
}: {
  /** When the stored logo last changed, or null when the shop has none. */
  logoUpdatedAt: string | null;
}) {
  const router = useRouter();

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /**
   * A locally chosen file, shown while it uploads.
   *
   * <p>The stored logo is the source of truth and takes over as soon as the
   * server has it. This exists only so the tile is not empty for the second or
   * two in between.
   */
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Object URLs hold the file in memory until explicitly released.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const storedUrl = shopLogoUrl(logoUpdatedAt);
  const shownUrl = previewUrl ?? storedUrl;

  // Type and size have already been checked by the drop zone.
  const handleFile = async (file: File) => {
    setError(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);

    const data = new FormData();
    data.append("file", file);

    setIsPending(true);
    const result = await uploadShopLogo(data);
    setIsPending(false);

    if (!result.success) {
      setError(result.message);
      URL.revokeObjectURL(nextPreview);
      setPreviewUrl(null);
      return;
    }

    // The stamp on the page is stale until the server data is re-read; the
    // action revalidated the paths, this applies them.
    router.refresh();
  };

  const handleRemove = async () => {
    setError(null);
    setIsPending(true);
    const result = await removeShopLogo();
    setIsPending(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink-soft">Company Logo</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="flex size-28 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-2 shadow-card">
            {shownUrl ? (
              // A plain <img>, not next/image: the source is either a local
              // object URL with no known dimensions or a proxy route serving
              // arbitrary bytes, and the image optimiser can handle neither.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownUrl}
                alt="The shop's logo"
                className="size-full object-contain"
              />
            ) : (
              <ImageIcon aria-hidden className="size-8 text-placeholder" />
            )}
          </div>

          {storedUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleRemove}
              className="h-8 px-2.5 text-danger hover:bg-danger-soft"
            >
              <Trash2 aria-hidden className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <FileDropzone
            accept={ACCEPTED_TYPES}
            maxSize={MAX_BYTES}
            onFile={(file) => void handleFile(file)}
            onReject={setError}
            isBusy={isPending}
            label={storedUrl ? "Replace the company logo" : "Upload a company logo"}
            title={storedUrl ? "Drop a new logo here" : "Drop your logo here"}
            hint="PNG, JPEG or WebP · up to 512 KB"
          />

          <p className="text-xs leading-relaxed text-muted">
            Around 400×400px is plenty — it is printed small at the top of a
            receipt.
            {storedUrl ? null : " Receipts print without one until you add it."}
          </p>

          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
