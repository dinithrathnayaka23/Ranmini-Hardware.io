"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Phone, Save, User } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/text-field";

import { saveProfileDetails } from "../actions";
import {
  profileDetailsSchema,
  type ProfileDetailsValues,
} from "../schemas/profile.schema";
import type { MyProfile } from "../services/profile.server";

/**
 * The details a person owns about themselves.
 *
 * <p>The username is shown but not editable, and says why. It is the identity
 * every sale and audit entry refers to, so letting it change would leave old
 * records pointing at a name that now belongs to somebody else — an explanation
 * is better than a field that silently refuses to work.
 */
export function ProfileDetailsForm({ profile }: { profile: MyProfile }) {
  const [notice, setNotice] = React.useState<{ tone: AlertTone; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      fullName: profile.fullName,
      email: profile.email ?? "",
      phone: profile.phone ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: ProfileDetailsValues) => {
    setNotice(null);
    const result = await saveProfileDetails(values);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    if (result.success) {
      // Re-seed the form with what was saved, so the fields stop counting as
      // dirty and a later cancel has nothing stale to fall back to.
      reset(values);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Details</CardTitle>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

          <TextField
            label="Full Name"
            icon={User}
            autoComplete="name"
            error={errors.fullName?.message}
            {...register("fullName")}
          />

          <TextField
            label="Email"
            icon={AtSign}
            type="email"
            placeholder="you@ranminihardware.lk"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.email?.message}
            {...register("email")}
          />

          <TextField
            label="Contact Number"
            icon={Phone}
            type="tel"
            placeholder="+94 77 123 4567"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register("phone")}
          />

          <div className="rounded-lg border border-line bg-canvas-subtle px-3.5 py-3">
            <p className="text-xs font-medium text-ink-soft">
              Username: <span className="font-semibold text-ink">{profile.username}</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              This cannot be changed. Every sale and record you have made refers
              to it, and changing it would leave those pointing at a name that no
              longer means you.
            </p>
          </div>

          <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
            <Save aria-hidden className="size-4" />
            Save Changes
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
