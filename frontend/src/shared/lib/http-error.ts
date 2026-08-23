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
  rateLimited: "Too many sign-in attempts. Please wait and try again.",
  network:
    "Unable to reach the server. Check your connection and try again.",
  unexpected: "Something went wrong. Please try again in a moment.",
} as const;

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
