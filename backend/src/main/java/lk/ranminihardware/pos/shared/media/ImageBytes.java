package lk.ranminihardware.pos.shared.media;

import java.util.Map;
import lk.ranminihardware.pos.shared.error.ApiException;

/**
 * Decides whether an uploaded file is really an image this service will serve.
 *
 * <p>Shared by every upload the API accepts — staff photographs and product
 * photographs — because the check is a security control and a second copy of a
 * security control is a second copy that can drift.
 *
 * <p>Two checks, and both are needed.
 *
 * <p>The declared content type is checked against an allowlist, because the type
 * the client sends is the type this service will later respond with. Let
 * {@code text/html} through and an image endpoint becomes a way to host a script
 * on the API's own origin — stored cross-site scripting, delivered by whichever
 * page shows the picture.
 *
 * <p>The bytes are then checked against the signature that type implies, because
 * the declared type is just a string the client chose. A file claiming to be a
 * PNG while actually being HTML is exactly the payload the first check is trying
 * to stop, and only the magic number can tell them apart.
 *
 * <p>Note what is deliberately <b>not</b> on the allowlist: SVG. An SVG is a
 * script-bearing document, so accepting one means either sanitising it or
 * serving it from an origin that cannot reach the portal's session. Neither is
 * worth the trouble for a photograph of a bag of cement.
 */
public final class ImageBytes {

  /**
   * Ceiling on a staff photograph.
   *
   * <p>The frontend resizes to a 256px square before uploading, which lands
   * around 20KB — so this is roughly twenty times what a well-behaved client
   * sends. It is a backstop against a client that does not resize, not a target:
   * an unbounded upload is a way to fill the database one request at a time.
   */
  public static final int MAX_AVATAR_BYTES = 512 * 1024;

  /**
   * Ceiling on the shop's logo.
   *
   * <p>The smallest of the three. A logo is drawn once, small, at the top of a
   * receipt roll 80mm wide and in a 96px box in the settings screen — there is
   * no size of source image above a few hundred kilobytes that improves either.
   */
  public static final int MAX_LOGO_BYTES = 512 * 1024;

  /**
   * Ceiling on a product photograph.
   *
   * <p>Larger than an avatar because a product picture is shown at card size on
   * the till and at thumbnail size in the inventory table, and a shopkeeper
   * photographing a shelf with a phone has no resizing tools to hand. Still
   * bounded: these live in Mongo, and the collection is read on every till load.
   */
  public static final int MAX_PRODUCT_IMAGE_BYTES = 1024 * 1024;

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
   * @param maxBytes the ceiling for this kind of upload — see the constants above
   * @throws ApiException when the upload is too large, the wrong type, or does
   *     not begin with the signature its declared type requires
   */
  public static void validate(byte[] data, String contentType, int maxBytes) {
    if (data == null || data.length == 0) {
      throw ApiException.badRequest("EMPTY_IMAGE", "That file is empty.");
    }
    if (data.length > maxBytes) {
      throw ApiException.badRequest(
          "IMAGE_TOO_LARGE",
          "The picture must be smaller than %d KB.".formatted(maxBytes / 1024));
    }

    String type = contentType == null ? "" : contentType.toLowerCase().trim();
    byte[] signature = SIGNATURES.get(type);

    if (signature == null) {
      throw ApiException.badRequest("UNSUPPORTED_IMAGE", "Use a PNG, JPEG or WebP image.");
    }
    if (!startsWith(data, signature)) {
      // The file lied about what it is. Reported as the same message as an
      // unsupported type: a client with an honest mistake fixes it the same way,
      // and one probing for a bypass learns nothing from the difference.
      throw ApiException.badRequest("UNSUPPORTED_IMAGE", "Use a PNG, JPEG or WebP image.");
    }
  }

  /** The media type as it will be stored and served — lower case, trimmed. */
  public static String normaliseType(String contentType) {
    return contentType == null ? "" : contentType.toLowerCase().trim();
  }

  private static boolean startsWith(byte[] data, byte[] prefix) {
    if (data.length < prefix.length) return false;
    for (int i = 0; i < prefix.length; i++) {
      if (data[i] != prefix[i]) return false;
    }
    return true;
  }
}
