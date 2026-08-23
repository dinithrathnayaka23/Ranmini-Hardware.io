import { redirect } from "next/navigation";

import { routes } from "@/shared/config/app.config";

/**
 * The application root has no public landing page yet — everything behind this
 * domain is the management portal, so send visitors to the sign-in screen.
 */
export default function RootPage() {
  redirect(routes.adminLogin);
}
