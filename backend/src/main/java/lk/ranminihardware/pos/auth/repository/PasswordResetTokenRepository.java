package lk.ranminihardware.pos.auth.repository;

import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.auth.domain.PasswordResetToken;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Password reset tokens.
 *
 * Lookups are by hash, never by the token itself, because the raw token is
 * never stored — see PasswordResetToken for why.
 */
public interface PasswordResetTokenRepository
    extends MongoRepository<PasswordResetToken, String> {

  Optional<PasswordResetToken> findByTokenHash(String tokenHash);

  /**
   * Every outstanding token for one account.
   *
   * Used to invalidate the rest when one is spent: a person who has just proved
   * they control the mailbox should not leave three more working links behind
   * them in an inbox somebody else might reach.
   */
  List<PasswordResetToken> findByStaffIdAndUsedAtIsNull(String staffId);
}
