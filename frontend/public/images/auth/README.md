# Sign-in showcase images

Photographs for the right-hand panel of the admin sign-in screen. They are
referenced from `src/modules/auth/constants/showcase-slides.ts`.

| File                      | Slide                          |
| ------------------------- | ------------------------------ |
| `showcase-operations.jpg` | "Streamline your hardware..."  |
| `showcase-inventory.jpg`  | "Every item, accounted for."   |
| `showcase-insights.jpg`   | "Decisions backed by data."    |

## Licensing

All three are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license), which permits free commercial
use with no attribution required. Source photographs:

| File                      | Unsplash photo ID                | Photographer   |
| ------------------------- | -------------------------------- | -------------- |
| `showcase-operations.jpg` | `1518709414768-a88981a4515d`     | Sidney Pearce  |
| `showcase-inventory.jpg`  | `1530124566582-a618bc2615dc`     | Quilia         |
| `showcase-insights.jpg`   | `1454988501794-2992f706932e`     | Wesley Caribe  |

Attribution is not required, but keeping this table means the originals can be
re-downloaded at a different size or crop later.

## Guidelines when replacing an image

- Portrait, at least 1400 x 1750 px — the panel is tall and crops with
  `object-fit: cover`.
- Optimised JPEG, ideally under 500 KB. Next.js re-encodes to WebP/AVIF on
  delivery, so these files only need to be good enough as masters.
- Keep the lower third visually calm and mid-to-dark: the headline and caption
  sit there in white over a gradient scrim.
- Avoid prominent third-party brand logos — this is a commercial storefront.

If a file is missing the panel falls back to the brand gradient, so the page
never shows a broken image.
