package lk.ranminihardware.pos.shared.error;

import java.time.Instant;
import java.util.Map;

/**
 * The single error envelope every failed request returns.
 *
 * One shape for every failure means the frontend has one thing to parse. The
 * {@code code} is what client code should branch on; {@code message} is written
 * for people and may be reworded at any time without breaking a caller.
 *
 * @param fieldErrors populated only for validation failures, mapping a field
 *     name to the first problem found with it.
 */
public record ApiError(
    Instant timestamp,
    int status,
    String code,
    String message,
    String path,
    Map<String, String> fieldErrors) {

  public static ApiError of(int status, String code, String message, String path) {
    return new ApiError(Instant.now(), status, code, message, path, null);
  }

  public static ApiError validation(String message, String path, Map<String, String> fieldErrors) {
    return new ApiError(Instant.now(), 400, "VALIDATION_FAILED", message, path, fieldErrors);
  }
}
