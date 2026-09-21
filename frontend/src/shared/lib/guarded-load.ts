import "server-only";

/**
 * Loads a page's data alongside its access check, letting the check decide the
 * outcome.
 *
 * <p><b>Why this exists.</b> The obvious way to load a guarded screen is one
 * `Promise.all` holding the guard and the fetches together:
 *
 * <pre>
 *   const [user, products] = await Promise.all([requireCashier(), fetchProducts()]);
 * </pre>
 *
 * <p>That is a race, and it was a live bug. `Promise.all` rejects with whichever
 * promise fails <em>first</em>, and the guards here refuse by calling Next's
 * `redirect()`, which works by throwing. So when an administrator opened the
 * till, two things failed at once: the guard threw a redirect to the dashboard,
 * and the catalogue fetch came back 403, because `/api/v1/pos/**` is a cashier
 * endpoint. Whichever answer arrived first won. Roughly half the time that was
 * the 403, and the owner got an error page reading "Your account does not have
 * access to that" instead of being quietly sent to their own dashboard — with
 * nothing in the logs to suggest it was not deterministic.
 *
 * <p><b>What this does.</b> The work is started immediately, so it still
 * overlaps the session round trip and the page is no slower than the broken
 * version. But only the guard is awaited first, so a redirect or an expired
 * session is always what surfaces. The data is awaited afterwards, by which
 * point the caller is known to be allowed to have asked for it.
 *
 * <p>A rejection from `work` is claimed with a no-op handler as soon as it is
 * started. Without that, a guard that throws would leave those promises
 * rejected and unawaited, which Node reports as an unhandled rejection and, by
 * default, treats as fatal — trading a wrong error page for a dead server.
 * Claiming it does not swallow it: the `Promise.all` below still sees the same
 * rejection and still throws it, in the case where the guard let us get there.
 *
 * @param guard the access check — `requireAdmin`, `requireCashier` or
 *     `requireSession` — whose verdict outranks anything `work` reports
 * @param work the page's data, started in parallel and awaited only once the
 *     guard has passed
 * @returns the guard's result followed by each item of `work`, in order
 */
export async function guardedLoad<G, W extends readonly unknown[]>(
  guard: Promise<G>,
  ...work: { readonly [K in keyof W]: Promise<W[K]> }
): Promise<[G, ...W]> {
  const pending = work as readonly Promise<unknown>[];

  // Claim every rejection now — see the note above on why an unawaited one is
  // fatal rather than merely noisy.
  for (const item of pending) {
    void item.catch(() => undefined);
  }

  // The only await that may reject before the caller is known to be allowed in.
  const subject = await guard;

  return [subject, ...((await Promise.all(pending)) as unknown as W)];
}
