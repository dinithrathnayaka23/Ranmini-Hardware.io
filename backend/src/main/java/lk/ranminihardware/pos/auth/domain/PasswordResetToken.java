package lk.ranminihardware.pos.auth.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A one-time permission to set a new password without knowing the old one.
 *
 * <p><b>Only a hash of the token is stored, never the token itself.</b> The
 * value in the email is the only copy that exists. That matters because this
 * collection is, by definition, a list of ways into accounts: if it leaked and
 * held the raw values, whoever read it could reset every outstanding request
 * before the owners did. Hashed, a leak yields nothing usable.
 *
 * <p>The hash is a plain SHA-256 rather than BCrypt, and that is deliberate
 * rather than an oversight. A slow hash exists to make guessing a
 * <em>low-entropy</em> secret expensive; this token is 32 bytes from a secure
 * random source, so guessing it is already infeasible and the only thing BCrypt
 * would add is latency on every validation.
 */
@Document(collection = "password_reset_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetToken {

  @Id private String id;

  /** SHA-256 of the token, hex-encoded. Indexed, and the only way in. */
  private String tokenHash;

  private String staffId;

  /**
   * Kept so the confirmation email can name the address it was sent to, and so
   * a token cannot be used after the account's email has since changed.
   */
  private String email;

  /**
   * When this stops working.
   *
   * <p>A TTL index on this field removes the document once it passes, so the
   * collection cannot grow without bound from requests nobody completed. The
   * expiry is still checked in code: TTL removal runs on a background sweep and
   * is not prompt enough to be a security control on its own.
   */
  private Instant expiresAt;

  /** Set the moment the token is spent, which is what makes it single-use. */
  private Instant usedAt;

  private Instant createdAt;

  /** Whether this token can still be exchanged for a password change. */
  public boolean isUsable(Instant now) {
    return usedAt == null && expiresAt != null && expiresAt.isAfter(now);
  }
}
