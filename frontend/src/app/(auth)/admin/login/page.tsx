import type { Metadata } from "next";

import { AdminLoginForm } from "@/modules/auth/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Sign In",
};

/**
 * `/admin/login` — entry point to the management portal.
 *
 * The page itself is a Server Component and renders no dynamic data; only the
 * interactive form below it runs on the client.
 */
export default function AdminLoginPage() {
  return (
    <div>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2rem]">
        Admin Sign In
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
        Enter your credentials to securely access the management portal.
      </p>

      <div className="mt-8 sm:mt-12">
        <AdminLoginForm />
      </div>
    </div>
  );
}
