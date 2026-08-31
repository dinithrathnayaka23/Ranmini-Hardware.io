/**
 * Derives the app's logo assets from the supplied master image.
 *
 * The master is a 1408x768 presentation mock-up: the circular logo floats in a
 * large grey field with a drop shadow and an AI-generator watermark in the
 * corner. None of that can ship — the grey would read as a pale box on the dark
 * navy sidebar, and the watermark has no business on a client's storefront.
 *
 * This crops to the circle, makes everything outside it transparent, and emits
 * the sizes the app actually uses. Run again if the master is ever replaced.
 */
import sharp from "sharp";

// Paths are relative to the frontend root, so run this from there:
//   node scripts/build-logo.mjs
const MASTER = "public/images/brand/ranmini-logo.png";

// Measured off the master by scanning for the navy ring: at the centre row the
// ring runs x 451..956, so the outer radius is 253 about (704, 373).
const CENTRE_X = 704;
const CENTRE_Y = 373;
const RING_RADIUS = 253;

// A little transparent margin around the ring. Without it the ring sits flush
// against the edge of the image box, which reads as a clipped logo the moment
// anything gives it a border or a rounded corner.
const MARGIN = 10;

const half = RING_RADIUS + MARGIN;
const size = half * 2;
const left = CENTRE_X - half;
const top = CENTRE_Y - half;

/**
 * A circular alpha mask.
 *
 * Pulled in a hair under the crop radius so the ring's own anti-aliased edge is
 * kept rather than clipped, which would leave a faint grey fringe from the
 * backdrop all the way round.
 */
const mask = Buffer.from(
  `<svg width="${size}" height="${size}">
     <circle cx="${half}" cy="${half}" r="${RING_RADIUS + 1}" fill="#fff"/>
   </svg>`,
);

const circular = await sharp(MASTER)
  .extract({ left, top, width: size, height: size })
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();

const outputs = [
  // The mark the app renders. 512 is enough for the sign-in screen at 2x DPI.
  { path: "public/images/brand/ranmini-mark.png", size: 512 },
  // Next generates every favicon size from this one file.
  { path: "src/app/icon.png", size: 512 },
  // iOS home-screen bookmark.
  { path: "src/app/apple-icon.png", size: 180 },
];

for (const output of outputs) {
  const info = await sharp(circular)
    .resize(output.size, output.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    // Palette-quantised: this is flat brand artwork, not a photograph, so a
    // 256-colour palette is visually identical and roughly a fifth the bytes.
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(output.path);

  console.log(`${output.path.padEnd(38)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
