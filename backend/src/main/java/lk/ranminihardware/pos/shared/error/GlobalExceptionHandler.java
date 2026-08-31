package lk.ranminihardware.pos.shared.error;

import com.mongodb.MongoWriteException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Turns every exception into the one {@link ApiError} envelope.
 *
 * The division of labour is deliberate. Anything modelled as an
 * {@link ApiException} carries copy that was written to be read by a user, so it
 * passes through. Everything else is logged in full for operators and reported
 * to the caller as a generic message, because an unexpected exception is by
 * definition one nobody vetted for disclosure.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
  private static final String GENERIC = "Something went wrong. Please try again in a moment.";

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
    // Not logged at error level on purpose: a missing product or insufficient
    // stock is an expected outcome, not a fault, and logging it as one buries
    // the faults that matter.
    return ResponseEntity.status(ex.getStatus())
        .body(
            ApiError.of(
                ex.getStatus().value(), ex.getCode(), ex.getMessage(), request.getRequestURI()));
  }

  /** A request body failed Bean Validation. */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> handleBodyValidation(
      MethodArgumentNotValidException ex, HttpServletRequest request) {

    Map<String, String> fields = new LinkedHashMap<>();
    for (FieldError error : ex.getBindingResult().getFieldErrors()) {
      // First problem per field only: a form shows one message per input.
      fields.putIfAbsent(error.getField(), error.getDefaultMessage());
    }

    return ResponseEntity.badRequest()
        .body(ApiError.validation("The request was not valid.", request.getRequestURI(), fields));
  }

  /** A query parameter or path variable failed validation. */
  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiError> handleParamValidation(
      ConstraintViolationException ex, HttpServletRequest request) {

    Map<String, String> fields = new LinkedHashMap<>();
    ex.getConstraintViolations()
        .forEach(v -> fields.putIfAbsent(v.getPropertyPath().toString(), v.getMessage()));

    return ResponseEntity.badRequest()
        .body(ApiError.validation("The request was not valid.", request.getRequestURI(), fields));
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MissingServletRequestParameterException.class,
    MethodArgumentTypeMismatchException.class
  })
  public ResponseEntity<ApiError> handleMalformed(Exception ex, HttpServletRequest request) {
    log.debug("Malformed request to {}: {}", request.getRequestURI(), ex.getMessage());
    return ResponseEntity.badRequest()
        .body(
            ApiError.of(
                400,
                "MALFORMED_REQUEST",
                "The request could not be read.",
                request.getRequestURI()));
  }

  /**
   * A unique index rejected the write.
   *
   * Reported as 409 rather than 500 because it is a business outcome the caller
   * can act on: two products cannot share a SKU.
   */
  @ExceptionHandler({DuplicateKeyException.class, MongoWriteException.class})
  public ResponseEntity<ApiError> handleDuplicate(Exception ex, HttpServletRequest request) {
    log.warn("Duplicate key rejected at {}: {}", request.getRequestURI(), ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(
            ApiError.of(409, "DUPLICATE", "That record already exists.", request.getRequestURI()));
  }

  /** Two writers raced on the same document and one lost. */
  @ExceptionHandler(OptimisticLockingFailureException.class)
  public ResponseEntity<ApiError> handleConcurrency(
      OptimisticLockingFailureException ex, HttpServletRequest request) {
    log.warn("Concurrent modification at {}: {}", request.getRequestURI(), ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(
            ApiError.of(
                409,
                "CONCURRENT_MODIFICATION",
                "Someone else changed this record. Reload and try again.",
                request.getRequestURI()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
    // Full detail for operators, nothing specific for the caller.
    log.error("Unhandled exception at {}", request.getRequestURI(), ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of(500, "INTERNAL_ERROR", GENERIC, request.getRequestURI()));
  }
}
