package lk.ranminihardware.pos.staff.repository;

import java.util.Optional;
import lk.ranminihardware.pos.staff.domain.StaffMember;
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

  Page<StaffMember> findByStatusOrderByFullNameAsc(StaffStatus status, Pageable pageable);
}
