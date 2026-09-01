package lk.ranminihardware.pos.staff.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A staff member's profile picture, stored as bytes.
 *
 * <p><b>Deliberately its own collection rather than a field on
 * {@link StaffMember}.</b> The staff document is the hottest read in the system
 * — every authenticated request resolves the signed-in user from it, and the
 * portal chrome asks for it on every page load. Putting image bytes there would
 * mean shipping a photograph across the wire on every request that only wanted a
 * name and a role.
 *
 * <p>The staff document keeps only {@code avatarVersion}, which is small,
 * answers "is there a picture" without a second read, and doubles as the
 * cache-busting token in the image URL.
 *
 * <p>The id is the staff id, so a person has exactly one picture and replacing
 * it is an upsert rather than a delete-and-insert that could leave two behind.
 */
@Document(collection = "staff_avatars")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffAvatar {

  /** The staff member's id. One picture per person, by construction. */
  @Id private String id;

  /**
   * The image's media type, from a closed allowlist.
   *
   * <p>Stored rather than sniffed at read time because it is what the response
   * is served with, and a type decided per-request could drift from the bytes
   * it describes.
   */
  private String contentType;

  private byte[] data;

  /** Matches {@code StaffMember.avatarVersion}; the two are written together. */
  private Instant updatedAt;
}
