package lk.ranminihardware.pos.shared.error;

import org.springframework.http.HttpStatus;

/**
 * A failure whose message is already safe to show an end user.
 *
 * Anything the service cannot classify is collapsed into a generic message by
 * {@link GlobalExceptionHandler}. Echoing raw failures to an API client is an
 * information-disclosure risk: stack traces name internal hosts, and a
 * "user not found" that reads differently from "wrong password" turns a login
 * endpoint into a username oracle.
 */
public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final String code;

  public ApiException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public HttpStatus getStatus() {
    return status;
  }

  /** Stable machine-readable identifier, e.g. PRODUCT_NOT_FOUND. */
  public String getCode() {
    return code;
  }

  public static ApiException notFound(String what, String id) {
    return new ApiException(
        HttpStatus.NOT_FOUND, "NOT_FOUND", "%s %s was not found.".formatted(what, id));
  }

  public static ApiException conflict(String code, String message) {
    return new ApiException(HttpStatus.CONFLICT, code, message);
  }

  public static ApiException badRequest(String code, String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, code, message);
  }

  public static ApiException unprocessable(String code, String message) {
    return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
  }
}
