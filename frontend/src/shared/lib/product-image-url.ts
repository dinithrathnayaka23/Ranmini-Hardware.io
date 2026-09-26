/**
 * Where a product's photograph is served from.
 *
 * <p>Two sources, in priority order. A photograph the shop uploaded lives in the
 * database and is served through this app's proxy; a picture bundled with the
 * build — the handful shipped under `public/images/products/` for a fresh
 * install — is referenced by its path. An upload wins, because somebody
 * photographing a product has plainly said which image they want.
 *
 * <p>The version stamp is part of the URL rather than a cache header, which is
 * what lets the response be cached immutably: a replaced photograph is a
 * different address, so the browser never has to be told the old one is stale.
 *
 * <p>`thumb` asks for the small copy made at upload, for grids of tiles: a
 * page of sixty full-size photographs would be tens of megabytes.
 *
 * @returns null when there is no picture at all, which is what makes the card
 *   and the table fall back to a neutral tile rather than a broken image.
 */
export function productImageUrl(
  product: {
    id: string;
    imageUrl?: string | null;
    imageVersion?: string | null;
  },
  variant: "full" | "thumb" = "full",
): string | null {
  if (product.imageVersion) {
    const size = variant === "thumb" ? "&size=thumb" : "";
    return `/api/product-images/${encodeURIComponent(product.id)}?v=${encodeURIComponent(
      product.imageVersion,
    )}${size}`;
  }
  return product.imageUrl ?? null;
}

/**
 * Whether a picture URL is served by this app's own signed-in proxy.
 *
 * <p>Those must not go through Next's image optimiser. The optimiser fetches the
 * picture itself, from the server, without the visitor's session cookie — so
 * the proxy refuses it and every uploaded photograph rendered as the fallback
 * tile, after a wasted round trip. They are already small (see `thumb`) and
 * cached immutably, so the optimiser had nothing to add anyway.
 */
export function isProxiedImage(url: string): boolean {
  return url.startsWith("/api/");
}
