package lk.ranminihardware.pos.shared.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Tile-sized copies of uploaded photographs, and refusing the uploads that
 * would hurt the server.
 */
class ThumbnailsTest {

  @Test
  @DisplayName("a large photograph becomes a small JPEG, keeping its shape")
  void scalesDown() throws Exception {
    Thumbnails.Thumbnail thumb = Thumbnails.of(png(2000, 1000, false)).orElseThrow();

    BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(thumb.data()));
    assertThat(thumb.contentType()).isEqualTo("image/jpeg");
    assertThat(decoded.getWidth()).isEqualTo(Thumbnails.MAX_EDGE);
    assertThat(decoded.getHeight()).isEqualTo(Thumbnails.MAX_EDGE / 2);
  }

  @Test
  @DisplayName("a small picture is not enlarged")
  void doesNotEnlarge() throws Exception {
    Thumbnails.Thumbnail thumb = Thumbnails.of(png(100, 80, false)).orElseThrow();

    BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(thumb.data()));
    assertThat(decoded.getWidth()).isEqualTo(100);
    assertThat(decoded.getHeight()).isEqualTo(80);
  }

  @Test
  @DisplayName("transparency becomes white, not black")
  void transparencyOnWhite() throws Exception {
    Thumbnails.Thumbnail thumb = Thumbnails.of(png(50, 50, true)).orElseThrow();

    BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(thumb.data()));
    Color corner = new Color(decoded.getRGB(0, 0));
    assertThat(corner.getRed()).isGreaterThan(240);
    assertThat(corner.getGreen()).isGreaterThan(240);
    assertThat(corner.getBlue()).isGreaterThan(240);
  }

  @Test
  @DisplayName("a file claiming an absurd size is refused without being decoded")
  void refusesDecompressionBombs() throws Exception {
    // A few dozen bytes declaring a 100,000 × 100,000 picture: decoded naively,
    // tens of gigabytes of memory.
    assertThat(Thumbnails.of(pngHeaderOnly(100_000, 100_000))).isEmpty();
  }

  @Test
  @DisplayName("damaged or unreadable files give no thumbnail rather than an error")
  void unreadableFiles() {
    assertThat(Thumbnails.of("not an image".getBytes(StandardCharsets.UTF_8))).isEmpty();
    assertThat(Thumbnails.of(new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'})).isEmpty();
    assertThat(Thumbnails.of(new byte[0])).isEmpty();
  }

  private static byte[] png(int width, int height, boolean transparent) throws Exception {
    BufferedImage image =
        new BufferedImage(width, height, transparent ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
    Graphics2D g = image.createGraphics();
    if (!transparent) {
      g.setColor(Color.ORANGE);
      g.fillRect(0, 0, width, height);
    }
    g.dispose();
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    ImageIO.write(image, "png", out);
    return out.toByteArray();
  }

  /** A PNG signature and a valid header chunk, and nothing else. */
  private static byte[] pngHeaderOnly(int width, int height) throws Exception {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    DataOutputStream out = new DataOutputStream(bytes);
    out.write(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});

    ByteArrayOutputStream chunk = new ByteArrayOutputStream();
    DataOutputStream c = new DataOutputStream(chunk);
    c.writeBytes("IHDR");
    c.writeInt(width);
    c.writeInt(height);
    c.writeByte(8); // bit depth
    c.writeByte(2); // truecolour
    c.writeByte(0);
    c.writeByte(0);
    c.writeByte(0);
    byte[] body = chunk.toByteArray();

    CRC32 crc = new CRC32();
    crc.update(body);
    out.writeInt(body.length - 4);
    out.write(body);
    out.writeInt((int) crc.getValue());
    return bytes.toByteArray();
  }
}
