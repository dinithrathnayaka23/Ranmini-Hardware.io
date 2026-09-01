package lk.ranminihardware.pos.staff.repository;

import lk.ranminihardware.pos.staff.domain.StaffAvatar;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Profile picture storage.
 *
 * No finders beyond the inherited ones: the id is the staff id, so there is
 * exactly one picture per person and nothing to search for.
 */
public interface StaffAvatarRepository extends MongoRepository<StaffAvatar, String> {}
