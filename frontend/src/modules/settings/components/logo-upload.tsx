"use client";

import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
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
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

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
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPEG or WebP image.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("The image must be 512 KB or smaller.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    const data = new FormData();
    data.append("file", file);

    setIsPending(true);
    const result = await uploadShopLogo(data);
    setIsPending(false);

    // The input keeps its value, so choosing the same file twice after a failure
    // would not fire another change event.
    event.target.value = "";

    if (!result.success) {
      setError(result.message);
      URL.revokeObjectURL(previewUrl ?? "");
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

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-canvas-subtle">
          {shownUrl ? (
            // A plain <img>, not next/image: the source is either a local object
            // URL with no known dimensions or a proxy route serving arbitrary
            // bytes, and the image optimiser can handle neither.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownUrl}
              alt="The shop's logo"
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isPending}
              loadingText="Saving…"
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden className="size-4" />
              {storedUrl ? "Replace" : "Upload"}
            </Button>

            {storedUrl ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={handleRemove}
              >
                <Trash2 aria-hidden className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            PNG, JPEG or WebP, up to 512 KB. Around 400×400px is plenty — it is
            printed small at the top of a receipt.
            {storedUrl ? null : " Receipts print without one until you add it."}
          </p>

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
