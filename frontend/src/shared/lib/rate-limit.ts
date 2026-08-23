import "server-only";

/**
 * Minimal fixed-window rate limiter for authentication endpoints.
 *
 * SCOPE: this is per-process, in-memory throttling. It raises the cost of a
 * naive credential-stuffing run against a single app instance, but it is NOT a
 * complete control — state is lost on restart and is not shared across
 * replicas. The authoritative limit must also live in the Spring Boot service
 * (and/or an edge WAF) before this goes to production behind a load balancer.
 */

interface WindowState {
  count: number;
  /** Epoch milliseconds at which the current window expires. */
  resetAt: number;
}

const windows = new Map<string, WindowState>();

/** Attempts allowed from one key within a window. */
const MAX_ATTEMPTS = 8;
/** Window length: 5 minutes. */
const WINDOW_MS = 5 * 60 * 1000;
/** Guard against unbounded memory growth from spoofed client addresses. */
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds the caller should wait before retrying. */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) evictExpired(now);
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears the counter for a key — called after a successful sign-in. */
export function resetRateLimit(key: string): void {
  windows.delete(key);
}

function evictExpired(now: number): void {
  for (const [key, state] of windows) {
    if (state.resetAt <= now) windows.delete(key);
  }
}

/**
 * Best-effort client identifier for throttling.
 *
 * `x-forwarded-for` is trivially spoofed unless a trusted proxy overwrites it,
 * so this is only ever used to slow abuse down — never to authorise anything.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip");
  return ip && ip.length > 0 ? ip : "unknown";
}
