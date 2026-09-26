package lk.ranminihardware.pos.auth.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import lk.ranminihardware.pos.staff.api.StaffAccount;
import lk.ranminihardware.pos.staff.domain.StaffRole;

/**
 * Request and response shapes for sign-in.
 *
 * <p>{@link LoginResponse} matches the frontend's existing
 * {@code BackendLoginResponse} field for field, so the Next.js route handler
 * that already exists needs no change to consume it.
 */
public final class AuthDtos {

  private AuthDtos() {}

  /**
   * Credentials.
   *
   * <p>Validation here is deliberately loose — length bounds only, no format
   * rules. A sign-in form should never explain why a username is "invalid",
   * because that tells an attacker what usernames look like. The bounds exist
   * only to stop an oversized payload burning CPU on the password hash.
   */
  public record LoginRequest(
      @NotBlank(message = "Enter your username.") @Size(max = 64) String username,
      @NotBlank(message = "Enter your password.") @Size(max = 128) String password) {}

  /** Issued on a successful sign-in. */
  public record LoginResponse(
      String accessToken, String refreshToken, long expiresIn, UserResponse user) {}

  public record RefreshRequest(@NotBlank String refreshToken) {}

  /**
   * The password a person chooses to replace a temporary one.
   *
   * <p>The upper bound only stops an obviously oversized payload reaching
   * BCrypt; the shop's minimum is checked in the service, against its setting.
   */
  public record ChoosePasswordRequest(
      @NotBlank(message = "Enter a new password.") @Size(max = 128) String password) {}

  /**
   * The signed-in user.
   *
   * <p>No password hash, no lockout state, no failure count. The account record
   * carries those; this is what makes it impossible for them to reach a client.
   */
  public record UserResponse(
      String id,
      String username,
      String fullName,
      String email,
      StaffRole role,
      /**
       * When the profile picture last changed, or null when there is none.
       *
       * <p>Carried here so the portal chrome can render an avatar from the
       * session it already has, without a second request on every page load —
       * and so the URL it builds changes when the picture does.
       */
      Instant avatarVersion,
      /**
       * True when the password was set by an administrator and has not yet been
       * replaced. The frontend sends such a session straight to the page for
       * choosing one — the only thing the backend will let it do anyway.
       */
      boolean passwordChangeRequired) {

    public static UserResponse from(StaffAccount account) {
      return new UserResponse(
          account.id(),
          account.username(),
          account.fullName(),
          account.email(),
          account.role(),
          account.avatarVersion(),
          account.passwordChangeRequired());
    }
  }
}
