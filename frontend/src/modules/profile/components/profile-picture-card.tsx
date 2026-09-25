"use client";

import { Trash2 } from "lucide-react";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Avatar } from "@/shared/components/ui/avatar";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { FileDropzone } from "@/shared/components/ui/file-dropzone";
import { avatarUrlFor } from "@/shared/lib/avatar-url";

import { removeAvatar, uploadAvatar } from "../actions";
import type { MyProfile } from "../services/profile.server";

/** What the API accepts, repeated here so the file picker offers the same set. */
const ACCEPTED = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};
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

  // Type and size have already been checked by the drop zone.
  const handleFile = async (file: File) => {
    setNotice(null);

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

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Avatar
              fullName={profile.fullName}
              imageUrl={preview ?? storedUrl}
              size={96}
              className="ring-4 ring-surface shadow-raised"
            />

            {storedUrl && !preview ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={handleRemove}
                className="h-8 px-2.5 text-danger hover:bg-danger-soft"
              >
                <Trash2 aria-hidden className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>

          <FileDropzone
            accept={ACCEPTED}
            maxSize={MAX_BYTES}
            onFile={(file) => void handleFile(file)}
            onReject={(message) => setNotice({ tone: "danger", message })}
            isBusy={isBusy}
            label={storedUrl ? "Change your profile picture" : "Upload a profile picture"}
            title={storedUrl ? "Drop a new picture here" : "Drop a picture here"}
            hint="PNG, JPEG or WebP · up to 512 KB · square looks best"
            className="w-full min-w-0 flex-1"
          />
        </div>
      </CardBody>
    </Card>
  );
}
