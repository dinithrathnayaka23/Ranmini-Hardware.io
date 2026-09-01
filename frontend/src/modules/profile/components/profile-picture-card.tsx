"use client";

import { Trash2, Upload } from "lucide-react";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Avatar } from "@/shared/components/ui/avatar";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { avatarUrlFor } from "@/shared/lib/avatar-url";

import { removeAvatar, uploadAvatar } from "../actions";
import type { MyProfile } from "../services/profile.server";

/** What the API accepts, repeated here so the file picker offers the same set. */
const ACCEPTED = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 512 * 1024;

/**
 * The profile picture, with upload and removal.
 *
 * <p>Shows a local preview the moment a file is chosen, before anything is
 * uploaded, so the person can see they picked the right photograph rather than
 * finding out after a round trip. The preview is revoked when it is replaced —
 * an object URL that is never released is a memory leak that lasts as long as
 * the tab.
 */
export function ProfilePictureCard({ profile }: { profile: MyProfile }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: AlertTone; message: string } | null>(null);

  // Release the object URL whenever it changes or the card unmounts.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const storedUrl = avatarUrlFor(profile.id, profile.avatarVersion);

  const handleFile = async (file: File) => {
    setNotice(null);

    if (!ACCEPTED.split(",").includes(file.type)) {
      setNotice({ tone: "danger", message: "Use a PNG, JPEG or WebP image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setNotice({
        tone: "danger",
        message: "That picture is larger than 512 KB. Choose a smaller one.",
      });
      return;
    }

    setPreview(URL.createObjectURL(file));
    setIsBusy(true);

    const data = new FormData();
    data.append("file", file);
    const result = await uploadAvatar(data);

    setIsBusy(false);
    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    // Dropped either way, but for different reasons. On success the action
    // revalidated the page, so the stored picture is now this one and showing
    // the local copy instead would leave Remove hidden behind a preview that
    // has nothing left to preview. On failure the stored picture is still the
    // real one, and the preview would be showing a photograph the server never
    // accepted.
    setPreview(null);
  };

  const handleRemove = async () => {
    setIsBusy(true);
    setNotice(null);

    const result = await removeAvatar();

    setIsBusy(false);
    setPreview(null);
    setNotice({ tone: result.success ? "success" : "danger", message: result.message });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
      </CardHeader>

      <CardBody className="space-y-4">
        {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

        <div className="flex items-center gap-5">
          <Avatar fullName={profile.fullName} imageUrl={preview ?? storedUrl} size={88} />

          <div className="min-w-0 space-y-2">
            <p className="text-sm text-muted">
              PNG, JPEG or WebP, up to 512&nbsp;KB. A square picture looks best —
              anything else is cropped to the circle.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                isLoading={isBusy}
                loadingText="Working…"
                onClick={() => inputRef.current?.click()}
              >
                <Upload aria-hidden className="size-4" />
                {storedUrl ? "Change picture" : "Upload picture"}
              </Button>

              {storedUrl && !preview ? (
                <Button
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
          The input is hidden and driven by the button above, because a bare
          file input cannot be styled to match anything else on the page. It
          stays a real focusable input rather than being display:none, so the
          keyboard and assistive tech still reach it.
        */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          aria-label="Choose a profile picture"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset first: choosing the same file twice in a row fires no
            // change event otherwise, so a retry after an error would do
            // nothing at all.
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </CardBody>
    </Card>
  );
}
