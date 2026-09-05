/**
 * Where the shop's logo is served from, or null when it has not set one.
 *
 * <p>The version stamp is part of the URL rather than a cache header, which is
 * what lets the response be cached immutably: a replaced logo is a different
 * address, so the browser never has to be told the old one is stale.
 *
 * <p>Returning null rather than a placeholder path is what lets the receipt
 * print nothing at all instead of a grey box, and the settings screen show its
 * own empty tile.
 */
export function shopLogoUrl(logoUpdatedAt: string | null | undefined): string | null {
  if (!logoUpdatedAt) return null;
  return `/api/shop-logo?v=${encodeURIComponent(logoUpdatedAt)}`;
}
