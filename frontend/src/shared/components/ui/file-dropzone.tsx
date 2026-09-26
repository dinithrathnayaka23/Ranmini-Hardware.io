"use client";

import { ImageUp, Loader2, type LucideIcon } from "lucide-react";
import * as React from "react";
import { type Accept, type FileRejection, useDropzone } from "react-dropzone";

import { cn } from "@/shared/lib/cn";

/*
 * Adapted from the UI Layouts "File Upload" component (MIT) — see
 * THIRD_PARTY_NOTICES.md. Theirs manages a list of files with a carousel of
 * previews; every upload in this app is exactly one file — a picture that
 * replaces the previous one, or a spreadsheet to import — so this keeps the drop
 * target and its drag feedback and hands the single accepted file straight to
 * the caller.
 */

/**
 * A drop target for one file, which is also a button that opens the picker.
 *
 * <p><b>Dropping is a convenience, not the only way in.</b> The whole area is a
 * focusable control that opens the ordinary file picker on click, Enter or
 * Space, so it works the same with a keyboard, on a touch screen, and for
 * anyone who never thinks to drag.
 *
 * <p><b>Type and size are checked here and again on the server.</b> The check
 * here only spares the person a pointless upload; the API is what decides,
 * because anything can be posted to it directly.
 */
export function FileDropzone({
  accept,
  maxSize,
  onFile,
  onReject,
  disabled = false,
  isBusy = false,
  label,
  title,
  hint,
  icon: Icon = ImageUp,
  typeMessage = "Choose a PNG, JPEG or WebP image.",
  className,
}: {
  accept: Accept;
  maxSize: number;
  onFile: (file: File) => void;
  /** Called with a message ready to show when a file is refused. */
  onReject: (message: string) => void;
  disabled?: boolean;
  /** Shows a spinner in place of the icon while an upload is in flight. */
  isBusy?: boolean;
  /** Accessible name for the control. */
  label: string;
  /** The visible prompt, e.g. "Drop a logo here". */
  title: string;
  /** Formats and size, shown under the prompt. */
  hint: string;
  /** Defaults to an image icon, since most drop zones here take pictures. */
  icon?: LucideIcon;
  /** What to say when a file of the wrong type is dropped. */
  typeMessage?: string;
  className?: string;
}) {
  const onDrop = React.useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        onReject(rejectionMessage(rejected[0], maxSize, typeMessage));
        return;
      }
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile, onReject, maxSize, typeMessage],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept,
    maxSize,
    maxFiles: 1,
    multiple: false,
    disabled: disabled || isBusy,
    onDrop,
  });

  return (
    <div
      {...getRootProps({
        "aria-label": label,
        "aria-busy": isBusy || undefined,
        className: cn(
          "group flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center",
          "transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
          isDragReject
            ? "border-danger/60 bg-danger-soft"
            : isDragActive
              ? "border-brand-600 bg-brand-50"
              : "border-line-strong bg-canvas-subtle hover:border-brand-400 hover:bg-brand-50/50",
          (disabled || isBusy) && "cursor-not-allowed opacity-70 hover:border-line-strong hover:bg-canvas-subtle",
          className,
        ),
      })}
    >
      <input {...getInputProps()} />

      <span
        aria-hidden
        className={cn(
          "flex size-10 items-center justify-center rounded-full bg-surface text-brand-600 shadow-card",
          "transition-transform duration-150 group-hover:-translate-y-0.5",
          isDragActive && "-translate-y-0.5",
        )}
      >
        {isBusy ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
      </span>

      <p className="text-sm text-ink-soft">
        {isBusy ? (
          "Uploading…"
        ) : isDragActive ? (
          isDragReject ? (
            "That file type is not accepted"
          ) : (
            "Release to upload"
          )
        ) : (
          <>
            {title}, or <span className="font-medium text-brand-600 underline-offset-2 group-hover:underline">browse</span>
          </>
        )}
      </p>

      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

/** Turns react-dropzone's error codes into a sentence a shop owner can act on. */
function rejectionMessage(rejection: FileRejection, maxSize: number, typeMessage: string): string {
  const code = rejection.errors[0]?.code;

  if (code === "file-too-large") {
    const size = maxSize >= 1024 * 1024 ? `${Math.round(maxSize / (1024 * 1024))} MB` : `${Math.round(maxSize / 1024)} KB`;
    return `That file is larger than ${size}. Choose a smaller one.`;
  }
  if (code === "file-invalid-type") {
    return typeMessage;
  }
  if (code === "too-many-files") {
    return "Choose one image at a time.";
  }
  return rejection.errors[0]?.message ?? "That file cannot be used.";
}
