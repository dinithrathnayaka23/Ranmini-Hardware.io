package lk.ranminihardware.pos.shared.media;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Optional;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Small JPEG copies of uploaded photographs, for grids of product tiles.
 *
 * <p>A till page shows sixty products. Sent at full size — up to a megabyte
 * each — a page of photographs would be tens of megabytes to a counter machine.
 * A tile is about 160 pixels wide, so a {@value #MAX_EDGE}-pixel copy (sharp on
 * a high-density screen) of a few kilobytes is all it ever needs.
 *
 * <p><b>Safe with hostile files.</b> An upload can be a few kilobytes that
 * declares a picture of a billion pixels; decoding it naively would exhaust the
 * server's memory. The dimensions are read from the header first, anything
 * absurd is refused, and the rest is decoded with subsampling — the decoder
 * skips pixels as it reads, so the full-size picture never exists in memory.
 *
 * <p>PNG and JPEG only: Java cannot decode WebP without an extra library. A WebP
 * photograph simply has no thumbnail, and its original is served instead — still
 * capped at the upload limit, just not as small.
 */
public final class Thumbnails {

  private static final Logger log = LoggerFactory.getLogger(Thumbnails.class);

  /** Longest edge of a thumbnail, in pixels. */
  public static final int MAX_EDGE = 320;

  /** Pictures claiming more pixels than this are not decoded at all. */
  private static final long MAX_SOURCE_PIXELS = 50_000_000L;

  private static final float JPEG_QUALITY = 0.8f;

  private Thumbnails() {}

  /** A thumbnail's bytes and their type. */
  public record Thumbnail(byte[] data, String contentType) {}

  /**
   * A thumbnail of the image, or empty when it cannot or need not be made — a
   * format Java cannot read, a damaged file, or an absurd size. Never throws:
   * the original is always a usable fallback.
   */
  public static Optional<Thumbnail> of(byte[] image) {
    try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(image))) {
      if (in == null) return Optional.empty();
      Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
      if (!readers.hasNext()) return Optional.empty();

      ImageReader reader = readers.next();
      try {
        reader.setInput(in, true, true);
        int width = reader.getWidth(0);
        int height = reader.getHeight(0);
        if (width <= 0 || height <= 0 || (long) width * height > MAX_SOURCE_PIXELS) {
          return Optional.empty();
        }

        // Decode at roughly twice the target size, skipping the pixels in
        // between, so memory is bounded by the output rather than the upload.
        int step = Math.max(1, Math.max(width, height) / (MAX_EDGE * 2));
        ImageReadParam param = reader.getDefaultReadParam();
        param.setSourceSubsampling(step, step, 0, 0);
        BufferedImage decoded = reader.read(0, param);

        return Optional.of(new Thumbnail(toJpeg(scale(decoded)), "image/jpeg"));
      } finally {
        reader.dispose();
      }
    } catch (IOException | RuntimeException ex) {
      log.warn("Could not make a thumbnail; the original will be served instead: {}", ex.getMessage());
      return Optional.empty();
    }
  }

  /**
   * Scales to fit {@link #MAX_EDGE}, painting transparency onto white — JPEG has
   * no alpha channel, and a transparent PNG would otherwise come out black.
   */
  private static BufferedImage scale(BufferedImage source) {
    double ratio = Math.min(1.0, (double) MAX_EDGE / Math.max(source.getWidth(), source.getHeight()));
    int width = Math.max(1, (int) Math.round(source.getWidth() * ratio));
    int height = Math.max(1, (int) Math.round(source.getHeight() * ratio));

    BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = target.createGraphics();
    try {
      g.setColor(Color.WHITE);
      g.fillRect(0, 0, width, height);
      g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
      g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
      g.drawImage(source, 0, 0, width, height, null);
    } finally {
      g.dispose();
    }
    return target;
  }

  private static byte[] toJpeg(BufferedImage image) throws IOException {
    ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
    ByteArrayOutputStream bytes = new ByteArrayOutputStream(32 * 1024);
    try (ImageOutputStream out = ImageIO.createImageOutputStream(bytes)) {
      writer.setOutput(out);
      ImageWriteParam param = writer.getDefaultWriteParam();
      param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
      param.setCompressionQuality(JPEG_QUALITY);
      writer.write(null, new IIOImage(image, null, null), param);
    } finally {
      writer.dispose();
    }
    return bytes.toByteArray();
  }
}
