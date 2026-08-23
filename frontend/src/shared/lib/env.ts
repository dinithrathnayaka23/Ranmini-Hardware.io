import "server-only";

import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * These variables are read ONLY inside Route Handlers / Server Components and
 * are never bundled into the browser payload (none of them are prefixed with
 * `NEXT_PUBLIC_`). Keeping the backend URL and any future secret server-side is
 * what allows the browser to talk to our own origin only, while this layer
 * holds the privileged connection to the Spring Boot API.
 *
 * The `server-only` import above makes the build fail loudly if this module is
 * ever imported from a Client Component — an early warning against leaks.
 */
const serverEnvSchema = z.object({
  /** Base URL of the Spring Boot API, e.g. http://localhost:8080 */
  API_BASE_URL: z
    .string()
    .min(1, "API_BASE_URL is required")
    .refine(isValidUrl, "API_BASE_URL must be an absolute URL"),

  /** Abort backend calls that hang, so a slow API cannot pile up requests. */
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

/**
 * Parses and caches the environment on first use.
 *
 * Validation is lazy (not at module load) so that a missing variable surfaces
 * as a clear runtime error on the route that needs it, instead of breaking an
 * unrelated build step with a stack trace nobody can read.
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // The message names the variables only — never their values.
    throw new Error(
      `Invalid server environment configuration:\n${details}\n\n` +
        "Copy .env.example to .env.local and fill in the missing values.",
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export const isProduction = (): boolean =>
  getServerEnv().NODE_ENV === "production";
