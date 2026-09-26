package lk.ranminihardware.pos.auth.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lk.ranminihardware.pos.audit.domain.AuditAction;
import lk.ranminihardware.pos.audit.service.AuditService;
import lk.ranminihardware.pos.auth.service.PasswordResetService;
import lk.ranminihardware.pos.auth.service.ResetRateLimiter;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recovering a forgotten password, by email or by asking the shop owner.
 *
 * <p>Open to anonymous callers by necessity — somebody who has forgotten their
 * password cannot sign in to ask. Everything that makes that safe lives here and
 * in {@link PasswordResetService}: the response never varies with whether an
 * account exists, and the endpoints are rate-limited.
 *
 * <p>Two routes because the staff are two kinds of people. Owners have email
 * addresses and can be sent a link; most cashiers have none, so for them the
 * request goes to the owner instead, who issues a temporary password.
 */
@RestController
@RequestMapping("/api/v1/auth/password-reset")
public class PasswordResetController {

  /**
   * The one answer {@code /request} ever gives.
   *
   * <p>Worded to be true whether or not the address belongs to an account. "We
   * have sent you an email" would be a lie half the time and, worse, a way to
   * test addresses one at a time.
   */
  private static final String SENT_MESSAGE =
      "If that email address belongs to an account, a reset link is on its way. "
          + "Check your inbox, and your spam folder.";

  /**
   * The one answer {@code /help} ever gives. Conditional for the same reason
   * {@link #SENT_MESSAGE} is: it must read the same for a username that exists
   * and one that does not.
   */
  private static final String HELP_MESSAGE =
      "If that username belongs to an active account, the shop owner has been asked "
          + "to reset it. They will give you a temporary password, and you will choose "
          + "your own the next time you sign in.";

  private final PasswordResetService resets;
  private final ResetRateLimiter rateLimiter;
  private final AuditService audit;

  public PasswordResetController(
      PasswordResetService resets, ResetRateLimiter rateLimiter, AuditService audit) {
    this.resets = resets;
    this.rateLimiter = rateLimiter;
    this.audit = audit;
  }

  /** Asks for a link. Always answers the same way. */
  @PostMapping("/request")
  public ResponseEntity<MessageResponse> request(
      @Valid @RequestBody ForgotPasswordRequest body, HttpServletRequest http) {

    // Both keys are checked, and both are counted, so that neither varying the
    // address nor coming from a new connection alone gets past the limit.
    boolean allowed = rateLimiter.allow("email:" + body.email().trim().toLowerCase());
    boolean allowedFromHere = rateLimiter.allow("ip:" + clientAddress(http));

    if (!allowed || !allowedFromHere) {
      throw new ApiException(
          HttpStatus.TOO_MANY_REQUESTS,
          "TOO_MANY_RESET_REQUESTS",
          "Too many reset requests. Wait a few minutes before trying again.");
    }

    resets.requestReset(body.email());

    return ResponseEntity.ok().header("Cache-Control", "no-store").body(new MessageResponse(SENT_MESSAGE));
  }

  /**
   * Asks the shop owner for a new password, for an account with no email.
   *
   * <p>Limited per username as well as per address, so one person at a till
   * cannot fill the owner's notifications with requests for every name they
   * can guess.
   */
  @PostMapping("/help")
  public ResponseEntity<MessageResponse> requestHelp(
      @Valid @RequestBody PasswordHelpRequest body, HttpServletRequest http) {

    boolean allowed = rateLimiter.allow("help:" + body.username().trim().toLowerCase());
    boolean allowedFromHere = rateLimiter.allow("ip:" + clientAddress(http));

    if (!allowed || !allowedFromHere) {
      throw new ApiException(
          HttpStatus.TOO_MANY_REQUESTS,
          "TOO_MANY_RESET_REQUESTS",
          "Too many reset requests. Wait a few minutes before trying again.");
    }

    resets
        .requestHelp(body.username())
        .ifPresent(
            member ->
                audit.record(
                    AuditAction.STAFF_PASSWORD_HELP_REQUESTED,
                    "STAFF",
                    member.getId(),
                    "%s (%s) asked for a password reset from the sign-in page."
                        .formatted(member.getFullName(), member.getUsername())));

    return ResponseEntity.ok()
        .header("Cache-Control", "no-store")
        .body(new MessageResponse(HELP_MESSAGE));
  }

  /**
   * Whether a link is still good, so the page can say so before the person
   * fills in a password twice for nothing.
   *
   * <p>Not an oracle worth worrying about: the only thing it reveals is whether
   * a 32-byte random value the caller already holds is live.
   */
  @GetMapping("/validate")
  public ResponseEntity<ValidationResponse> validate(@RequestParam("token") String token) {
    return ResponseEntity.ok()
        .header("Cache-Control", "no-store")
        .body(new ValidationResponse(resets.isTokenUsable(token)));
  }

  /** Spends the link and sets the new password. */
  @PostMapping("/confirm")
  public ResponseEntity<MessageResponse> confirm(@Valid @RequestBody ResetPasswordRequest body) {
    // Rate-limited on the token as well. A live token is unguessable, but this
    // stops a captured one being used to hammer the password rules.
    if (!rateLimiter.allow("token:" + body.token())) {
      throw new ApiException(
          HttpStatus.TOO_MANY_REQUESTS,
          "TOO_MANY_RESET_REQUESTS",
          "Too many attempts. Wait a few minutes before trying again.");
    }

    resets.resetPassword(body.token(), body.password());

    return ResponseEntity.ok()
        .header("Cache-Control", "no-store")
        .body(new MessageResponse("Your password has been changed. You can sign in with it now."));
  }

  /**
   * The caller's address, for rate limiting only.
   *
   * <p>Deliberately the socket address rather than {@code X-Forwarded-For}: that
   * header is caller-supplied text, and trusting it would let anyone reset their
   * own counter by inventing a new value per request. If this is ever put behind
   * a reverse proxy, configure Spring's {@code ForwardedHeaderFilter} so the
   * socket address is corrected once, in one place, rather than reading the
   * header here.
   */
  private static String clientAddress(HttpServletRequest request) {
    String address = request.getRemoteAddr();
    return address == null ? "unknown" : address;
  }

  /**
   * The address to send to.
   *
   * <p>{@code @Email} only checks the shape. It is not a hint about whether an
   * account exists, and the service never treats a well-formed address as one.
   */
  public record ForgotPasswordRequest(
      @NotBlank(message = "Enter your email address.")
          @Email(message = "Enter a valid email address.")
          @Size(max = 254)
          String email) {}

  /** The username to ask about. Shape only — never a hint that it exists. */
  public record PasswordHelpRequest(
      @NotBlank(message = "Enter your username.") @Size(max = 64) String username) {}

  /**
   * A link and the password to set.
   *
   * <p>The lower bound is checked in the service against the shop's configured
   * minimum; the bounds here exist only to reject a payload that is obviously
   * not a password before it reaches BCrypt.
   */
  public record ResetPasswordRequest(
      @NotBlank(message = "The reset link is missing its token.") @Size(max = 128) String token,
      @NotBlank(message = "Enter a new password.") @Size(max = 128) String password) {}

  public record MessageResponse(String message) {}

  public record ValidationResponse(boolean valid) {}
}
