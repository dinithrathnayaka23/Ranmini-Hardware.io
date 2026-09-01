import type { Metadata } from "next";

import { ChangePasswordForm } from "@/modules/profile/components/change-password-form";
import { ProfileDetailsForm } from "@/modules/profile/components/profile-details-form";
import { ProfilePictureCard } from "@/modules/profile/components/profile-picture-card";
import { fetchMyProfile } from "@/modules/profile/services/profile.server";
import { PageHeader } from "@/shared/components/layout/page-header";

export const metadata: Metadata = {
  title: "My Profile",
};

/**
 * `/admin/profile` — your own account.
 *
 * <p>Distinct from Settings, which configures the shop. This is the person
 * signed in: their name, how to reach them, their picture and their password.
 *
 * <p>No id anywhere on the page or in the actions it calls. The API resolves
 * the account from the session, so the only record reachable from here is the
 * caller's own.
 */
export default async function AdminProfilePage() {
  const profile = await fetchMyProfile();

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Profile"
        description="Your own account details, picture and password. Shop-wide configuration lives under Settings."
      />

      {/*
        Picture and password beside the details from `xl`, stacked below it. The
        details form comes first in the DOM so it is also what reads first on a
        phone — the thing most often edited, before the two occasional tasks.
      */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <ProfileDetailsForm profile={profile} />
        </div>

        <div className="min-w-0 space-y-5">
          <ProfilePictureCard profile={profile} />
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
