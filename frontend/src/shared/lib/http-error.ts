/**
 * A backend failure that is safe to describe to the end user.
 *
 * Anything we cannot classify is deliberately collapsed into a generic
 * message: leaking raw backend errors to a login screen is an information
 * disclosure risk (stack traces, hostnames, whether a username exists).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** User-facing copy for failures the UI is allowed to explain precisely. */
export const errorMessages = {
  invalidCredentials: "Invalid username or password. Please try again.",
  accountLocked:
    "This account is temporarily locked. Contact your administrator.",
  accountDeactivated:
    "Your account is currently deactivated. Please contact the shop owner to have it reactivated.",
  rateLimited: "Too many sign-in attempts. Please wait and try again.",
  network:
    "Unable to reach the server. Check your connection and try again.",
  unexpected: "Something went wrong. Please try again in a moment.",
} as const;

/**
 * Backend error codes whose message the sign-in screen may show as it came.
 *
 * An allowlist, not a passthrough. Echoing whatever the API said would let any
 * future backend error leak internals onto a public form; naming the two codes
 * the API is deliberately explicit about keeps everything else generic.
 *
 * Both are reachable only by somebody who already typed the right password —
 * the service checks the credentials before it says an account is locked or
 * switched off — so neither can be used to discover whether a username exists.
 */
const EXPLICIT_AUTH_CODES: Record<string, string> = {
  ACCOUNT_DEACTIVATED: errorMessages.accountDeactivated,
  ACCOUNT_LOCKED: errorMessages.accountLocked,
};

/**
 * The message to show for a failed sign-in.
 *
 * Prefers this app's own copy for a code it recognises, falls back to the
 * status-based message otherwise. The backend's own wording is used only when
 * it says something the frontend has no copy for — never for a 401, which stays
 * deliberately vague.
 */
export function messageForAuthFailure(
  status: number,
  code: string | null,
  backendMessage: string | null,
): string {
  if (code && code in EXPLICIT_AUTH_CODES) {
    return EXPLICIT_AUTH_CODES[code];
  }
  if (status === 403 && backendMessage) {
    // A 403 the frontend does not have a code for: the API only refuses a
    // verified credential for reasons the person needs to hear, so its wording
    // is better than "something went wrong".
    return backendMessage;
  }
  return messageForStatus(status);
}

/**
 * Maps an HTTP status from the Spring Boot API onto vetted user-facing copy.
 *
 * Note that 401 and 404 both map to the same generic credential message so the
 * login form cannot be used to enumerate valid usernames.
 */
export function messageForStatus(status: number): string {
  switch (status) {
    case 400:
    case 401:
    case 404:
      return errorMessages.invalidCredentials;
    case 403:
      return errorMessages.accountLocked;
    case 429:
      return errorMessages.rateLimited;
    default:
      return errorMessages.unexpected;
  }
}
