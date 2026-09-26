package lk.ranminihardware.pos.staff.repository;

import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Staff persistence.
 *
 * The username and email lookups are backed by unique indexes, which is what
 * actually prevents duplicates: an application-level existence check alone
 * races two concurrent registrations straight past each other.
 */
public interface StaffRepository extends MongoRepository<StaffMember, String> {

  Optional<StaffMember> findByUsername(String username);

  boolean existsByUsername(String username);

  boolean existsByEmailIgnoreCase(String email);

  /**
   * Finds an account by its email address, for password reset.
   *
   * Case-insensitive because nobody types their own address the same way twice,
   * and an address that fails to match here would look to the person like the
   * reset silently doing nothing.
   */
  Optional<StaffMember> findByEmailIgnoreCase(String email);

  Page<StaffMember> findByStatusOrderByFullNameAsc(StaffStatus status, Pageable pageable);

  /**
   * Whether anybody can currently sign in with the given role.
   *
   * Used at startup to warn that the till has no usable account — see
   * TillAccountCheck. Deliberately an existence check rather than a count: the
   * answer is a yes or no, and asking Mongo to stop at the first match is both
   * the cheaper query and the more honest statement of the question.
   */
  boolean existsByRoleAndStatus(StaffRole role, StaffStatus status);

  /**
   * Open requests for a password reset, newest first.
   *
   * Served by the sparse {@code ix_staff_password_help} index, which holds only
   * accounts with a request open — a handful at most — so the notification feed
   * that calls this on every page load never touches the rest of the collection.
   */
  List<StaffMember> findByPasswordHelpRequestedAtIsNotNullAndStatusOrderByPasswordHelpRequestedAtDesc(
      StaffStatus status, Pageable pageable);
}
