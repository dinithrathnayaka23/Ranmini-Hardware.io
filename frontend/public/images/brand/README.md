# Brand assets

The Ranmini Hardware logo. **This is the client's own artwork**, not stock
imagery — unlike everything in `../auth/` and `../products/`, it must not be
swapped for a substitute.

| File | What it is |
| ---- | ---------- |
| `ranmini-logo.png` | The master, exactly as supplied. Do not reference this from the app. |
| `ranmini-mark.png` | The derived mark the app actually renders. |

## Why there are two

The master is a 1408 × 768 presentation mock-up: the circular logo floats in a
large grey field, with a drop shadow and the image generator's watermark in the
bottom-right corner. None of that can ship.

- The grey field would render as a pale rectangle on the dark navy sidebar.
- The watermark has no business on a client's storefront.
- At 1.6 MB it is roughly fourteen times the size of what the app needs.

`scripts/build-logo.mjs` crops to the circle, masks everything outside it to
transparent, and writes the sizes the app uses:

```bash
cd frontend
node scripts/build-logo.mjs
```

| Output | Used by |
| ------ | ------- |
| `public/images/brand/ranmini-mark.png` | The `Logo` component — sidebar, sign-in pages, till top bar |
| `src/app/icon.png` | The browser-tab favicon. Next generates every size from this one file. |
| `src/app/apple-icon.png` | iOS home-screen bookmark |

## If the logo is ever replaced

Drop the new master in as `ranmini-logo.png` and re-run the script. The crop is
driven by three constants at the top of it — the circle's centre and radius,
measured off the current master by scanning for the navy ring. A differently
composed image will need those re-measured, and the script prints the output
sizes so it is obvious whether the crop landed.

**Ask for an SVG if one exists.** The mark renders at 512px and is scaled down
everywhere it is used, so it holds up — but vector artwork would be sharper on a
high-density screen and a fraction of the bytes. A PNG is a fallback, not the
right long-term answer for a logo.

## The wordmark text is deliberate

The mark contains the shop's name inside the circle, and the `Logo` component
still renders the name as text beside it. That is not duplication: at the 32–36px
the mark renders at in a sidebar or top bar, the lettering inside the circle is
well below legible and reads as texture. The text carries the name at small
sizes and is what a screen reader announces, which is why the image is marked
decorative whenever the text is present.
