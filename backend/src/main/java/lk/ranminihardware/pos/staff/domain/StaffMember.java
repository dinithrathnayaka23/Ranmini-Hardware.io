package lk.ranminihardware.pos.staff.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Someone who works in the shop.
 *
 * <p>This is also the account the authentication phase will sign in — the
 * credential fields are here now so that work is an addition rather than a
 * migration of every existing record.
 */
@Document(collection = "staff")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffMember {

  @Id private String id;

  private String fullName;

  /** Login name. Unique, stored lowercase so it cannot collide by case alone. */
  private String username;

  private String email;

  private String phone;

  private StaffRole role;

  @Builder.Default private StaffStatus status = StaffStatus.ACTIVE;

  private LocalDate joinedOn;

  /** Updated on sign-in; drives the "clocked in 2 hours ago" line. */
  private Instant lastActiveAt;

  /**
   * When the profile picture was last written, or null when there is none.
   *
   * <p>The picture itself lives in its own collection — see {@link StaffAvatar}
   * for why. Only this stamp sits on the staff document, which is read on every
   * authenticated request: it answers "is there a picture" without a second
   * query, and doubles as the cache-busting token in the image URL, so a new
   * photograph appears immediately while an unchanged one stays cached.
   */
  private Instant avatarVersion;

  /**
   * BCrypt hash of the password. Never the password itself.
   *
   * <p>Marked {@code @JsonIgnore} as a second line of defence. The API already
   * responds with DTOs that have no such field, but a document serialised
   * directly by a future endpoint — or by a debug log — must not be able to
   * leak this.
   */
  @JsonIgnore private String passwordHash;

  /**
   * Consecutive failed sign-ins, for lockout.
   *
   * <p>Stored on the account rather than kept in memory so a lockout survives a
   * restart and applies across every instance. An in-memory counter is bypassed
   * by restarting the service or by hitting a different replica.
   */
  @Builder.Default private int failedLoginAttempts = 0;

  /** Set when the lockout threshold is hit; null when the account is usable. */
  private Instant lockedUntil;

  /**
   * Whether the current password was chosen by somebody else and must be
   * replaced at the next sign-in.
   *
   * <p>Set when an administrator issues a temporary password. Until the person
   * chooses their own, their session can do nothing except that — so the owner
   * who read the temporary password out loud never ends up knowing a password
   * the cashier actually uses.
   */
  @Builder.Default private boolean passwordChangeRequired = false;

  /**
   * When this person last asked, from the sign-in page, for the owner to reset
   * their password; null when no request is open.
   *
   * <p>This is the recovery route for accounts with no email address, which is
   * most cashiers. It surfaces in the administrators' notification feed and is
   * cleared the moment the password changes by any route.
   */
  private Instant passwordHelpRequestedAt;

  /**
   * When this person last opened the notification panel, or null if never.
   *
   * <p>One timestamp rather than a read/unread flag per notification, because
   * the feed is derived from live data instead of stored: there is no
   * notification document to mark. Anything that happened after this stamp is
   * unread, which is also what makes a low-stock warning re-appear when the
   * stock falls further — the underlying product changed, so the alert is new
   * information rather than the same one dismissed twice.
   */
  private Instant notificationsReadAt;

  @CreatedDate private Instant createdAt;

  @LastModifiedDate private Instant updatedAt;

  @Version private Long version;
}
