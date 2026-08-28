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
export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  /**
   * Path to a profile photo under `public/`, or null for the initials
   * fallback. Optional because the backend may not store one.
   */
  avatarUrl?: string | null;
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
