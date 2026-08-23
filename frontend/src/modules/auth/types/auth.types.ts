/**
 * Contract between the Next.js client layer and the Spring Boot API.
 *
 * Keeping these shapes in one place means a change on the backend surfaces as
 * a TypeScript error here rather than as an `undefined` at runtime.
 */

/** The authenticated administrator, as returned by the backend. */
export interface AdminProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

/** Raw payload returned by `POST {API_BASE_URL}/api/v1/auth/login`. */
export interface BackendLoginResponse {
  accessToken: string;
  refreshToken?: string;
  /** Access-token lifetime in seconds, as issued by the backend. */
  expiresIn: number;
  user: AdminProfile;
}

/**
 * What the browser is allowed to see after a login attempt.
 *
 * Deliberately free of tokens: those are written straight into httpOnly
 * cookies by the Route Handler and never travel through JavaScript.
 */
export type LoginOutcome =
  | { success: true; user: AdminProfile }
  | { success: false; message: string };
