# Product catalogue images

Photographs for the product cards on the till (`/cashier/pos`). They are
referenced from `src/modules/pos/constants/pos-data.ts`.

**These are stand-ins, not the shop's stock.** A point-of-sale grid is scanned
by picture as much as by name, so these should be replaced with photographs of
the actual products Ranmini Hardware sells before the till goes live. Products
with no photograph on file render a neutral tile instead — see `ProductImage`
in `src/modules/pos/components/product-card.tsx` — so the catalogue degrades
gracefully rather than showing broken images while that work is outstanding.

| File                    | Stands in for            |
| ----------------------- | ------------------------ |
| `cement-portland.jpg`   | Cemex Portland 50kg      |
| `pvc-pipe.jpg`          | PVC Pipe 1" 10ft         |
| `emulsion-paint.jpg`    | Emulsion Paint White 4L  |
| `wire-nails.jpg`        | Wire Nails 2" (1kg)      |

## Licensing

All four are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license), which permits free commercial
use with no attribution required. Source photographs:

| File                  | Unsplash photo ID | Photographer     |
| --------------------- | ----------------- | ---------------- |
| `cement-portland.jpg` | `Yebob023vPw`     | Andrey Soldatov  |
| `pvc-pipe.jpg`        | `DByY8MbE9OE`     | Azka Rayhansyah  |
| `emulsion-paint.jpg`  | `dw5fYCa8kFs`     | henry perks      |
| `wire-nails.jpg`      | `q37QoC0m_is`     | Gabriel Mihalcea |

Attribution is not required, but keeping this table means the originals can be
re-downloaded at a different size or crop later.

## Guidelines when replacing an image

- Landscape, at least 800 px wide. Cards crop to a 4:3 tile with
  `object-fit: cover`, so keep the subject centred.
- Optimised JPEG. Next.js re-encodes to WebP/AVIF on delivery, so these files
  only need to be good enough as masters.
- **No third-party brand logos.** This is a commercial storefront, and a
  competitor's cement bag on Ranmini's own till is not a good look. Two
  otherwise excellent cement photographs were rejected for exactly this; the
  current file is unbranded material texture as a result, which is a further
  reason to shoot the real product.
- Plain, evenly lit backgrounds read fastest at card size — the nails and paint
  images are the benchmark here, not the cement texture.
