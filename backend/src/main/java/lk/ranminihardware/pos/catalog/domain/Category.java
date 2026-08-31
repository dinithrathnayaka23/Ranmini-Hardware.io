package lk.ranminihardware.pos.catalog.domain;

import java.time.Instant;
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
 * A product grouping — the filter chips above the till's grid.
 *
 * <p>Deliberately flat rather than a tree. A hardware shop's categories are a
 * short list ("Cement &amp; Sand", "Plumbing", "Electrical"), and a nested
 * hierarchy in Mongo means either recursive queries or materialised paths, both
 * of which cost more than this shop will ever get back. If the client later
 * needs sub-categories, a {@code parentId} plus a materialised {@code path} is
 * the migration — not a redesign.
 */
@Document(collection = "categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

  @Id private String id;

  private String name;

  /**
   * URL-safe identifier, e.g. "cement-sand".
   *
   * <p>Unique, and stable across renames, so a bookmarked filter keeps working
   * when the shop reworders its shelf labels.
   */
  private String slug;

  /** Controls the order of the chips on the till. */
  private int displayOrder;

  @Builder.Default private boolean active = true;

  @CreatedDate private Instant createdAt;

  @LastModifiedDate private Instant updatedAt;

  @Version private Long version;
}
