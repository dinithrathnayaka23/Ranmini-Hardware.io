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
 * @returns null when there is no picture at all, which is what makes the card
 *   and the table fall back to a neutral tile rather than a broken image.
 */
export function productImageUrl(product: {
  id: string;
  imageUrl?: string | null;
  imageVersion?: string | null;
}): string | null {
  if (product.imageVersion) {
    return `/api/product-images/${encodeURIComponent(product.id)}?v=${encodeURIComponent(
      product.imageVersion,
    )}`;
  }
  return product.imageUrl ?? null;
}
