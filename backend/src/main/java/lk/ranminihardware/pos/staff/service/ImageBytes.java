package lk.ranminihardware.pos.staff.service;

import java.util.Map;
import lk.ranminihardware.pos.shared.error.ApiException;

/**
 * Decides whether an uploaded file is really an image this service will serve.
 *
 * <p>Two checks, and both are needed.
 *
 * <p>The declared content type is checked against an allowlist, because the
 * type the client sends is the type this service will later respond with. Let
 * {@code text/html} through and the avatar endpoint becomes a way to host a
 * script on the API's own origin — stored cross-site scripting, delivered by
 * the profile page.
 *
 * <p>The bytes are then checked against the signature that type implies,
 * because the declared type is just a string the client chose. A file claiming
 * to be a PNG while actually being HTML is exactly the payload the first check
 * is trying to stop, and only the magic number can tell them apart.
 */
final class ImageBytes {

  /**
   * Hard ceiling on an avatar.
   *
   * <p>The frontend resizes to a 256px square before uploading, which lands
   * around 20KB — so this is roughly twenty times what a well-behaved client
   * sends. It is a backstop against a client that does not resize, not a
   * target: an unbounded upload is a way to fill the database one request at a
   * time.
   */
  static final int MAX_BYTES = 512 * 1024;

  /** Media types this service accepts and will serve back. */
  private static final Map<String, byte[]> SIGNATURES =
      Map.of(
          "image/png", new byte[] {(byte) 0x89, 'P', 'N', 'G'},
          "image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},
          // WebP is RIFF....WEBP; the first four bytes are enough to reject
          // anything that is not a RIFF container at all.
          "image/webp", new byte[] {'R', 'I', 'F', 'F'});

  private ImageBytes() {}

  /**
   * @throws ApiException when the upload is too large, the wrong type, or does
   *     not begin with the signature its declared type requires
   */
  static void validate(byte[] data, String contentType) {
    if (data == null || data.length == 0) {
      throw ApiException.badRequest("EMPTY_IMAGE", "That file is empty.");
    }
    if (data.length > MAX_BYTES) {
      throw ApiException.badRequest(
          "IMAGE_TOO_LARGE", "The picture must be smaller than 512 KB.");
    }

    String type = contentType == null ? "" : contentType.toLowerCase().trim();
    byte[] signature = SIGNATURES.get(type);

    if (signature == null) {
      throw ApiException.badRequest(
          "UNSUPPORTED_IMAGE", "Use a PNG, JPEG or WebP image.");
    }
    if (!startsWith(data, signature)) {
      // The file lied about what it is. Reported as the same message as an
      // unsupported type: a client with an honest mistake fixes it the same
      // way, and one probing for a bypass learns nothing from the difference.
      throw ApiException.badRequest(
          "UNSUPPORTED_IMAGE", "Use a PNG, JPEG or WebP image.");
    }
  }

  private static boolean startsWith(byte[] data, byte[] prefix) {
    if (data.length < prefix.length) return false;
    for (int i = 0; i < prefix.length; i++) {
      if (data[i] != prefix[i]) return false;
    }
    return true;
  }
}
