/**
 * Contract between the Next.js client layer and the Spring Boot API.
 *
 * Keeping these shapes in one place means a change on the backend surfaces as
 * a TypeScript error here rather than as an `undefined` at runtime.
 */

/**
 * An authenticated user of either portal — an administrator or a cashier.
 *
 * The shape is deliberately common to both: the portal decides which screens a
 * session may reach, while `role` is display copy returned by the backend
 * ("Owner", "Cashier") and must never be used to make an access decision on
 * the client.
 */
export type UserRole = "ADMIN" | "CASHIER";

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  /** Null for accounts created without one, which the quick-add form does. */
  email: string | null;
  /**
   * Two roles, matching the backend exactly. ADMIN is the owner and his son
   * with identical privileges; CASHIER reaches the till and nothing else.
   */
  role: UserRole;
  /**
   * When the profile picture last changed, or null when there is none.
   *
   * <p>Not a URL. The picture is served through this app's own avatar route,
   * which builds the URL from the id and this stamp — so a new photograph is a
   * new URL and the browser cannot show a cached copy of the old one.
   */
  avatarVersion?: string | null;
  /**
   * True while the password is a temporary one an administrator set.
   *
   * <p>The backend refuses such a session everything except choosing a new
   * password, so the frontend sends it straight to the page for that rather
   * than rendering screens whose every request would fail.
   */
  passwordChangeRequired?: boolean;
}

/** Raw payload returned by the backend's role-scoped login endpoints. */
export interface BackendLoginResponse {
  accessToken: string;
  refreshToken?: string;
  /** Access-token lifetime in seconds, as issued by the backend. */
  expiresIn: number;
  user: UserProfile;
}

/**
 * What the browser is allowed to see after a login attempt.
 *
 * Deliberately free of tokens: those are written straight into httpOnly
 * cookies by the Route Handler and never travel through JavaScript.
 */
export type LoginOutcome =
  | { success: true; user: UserProfile }
  | { success: false; message: string };
