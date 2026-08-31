package lk.ranminihardware.pos.catalog.service;

import java.util.List;
import java.util.Locale;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.repository.CategoryRepository;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Category rules.
 *
 * <p>The list is cached because the till asks for it on every load and it
 * changes perhaps twice a year. Every write evicts the cache, so a rename shows
 * up on the next request rather than after the TTL.
 */
@Service
public class CategoryService {

  private static final Logger log = LoggerFactory.getLogger(CategoryService.class);

  /** Cache name shared by the read and the eviction below. */
  private static final String CACHE = "activeCategories";

  private final CategoryRepository categories;
  private final MongoTemplate mongo;

  public CategoryService(CategoryRepository categories, MongoTemplate mongo) {
    this.categories = categories;
    this.mongo = mongo;
  }

  @Cacheable(CACHE)
  public List<Category> listActive() {
    return categories.findByActiveIsTrueOrderByDisplayOrderAscNameAsc();
  }

  public Category get(String id) {
    return categories.findById(id).orElseThrow(() -> ApiException.notFound("Category", id));
  }

  @CacheEvict(value = CACHE, allEntries = true)
  public Category create(String name, Integer displayOrder) {
    String slug = toSlug(name);

    // Checked here for a friendly message, but the unique index is what
    // actually guarantees it — this check alone would race two concurrent
    // creates straight past each other.
    if (categories.existsBySlug(slug)) {
      throw ApiException.conflict(
          "CATEGORY_EXISTS", "A category with a similar name already exists.");
    }

    return categories.save(
        Category.builder()
            .name(name.trim())
            .slug(slug)
            .displayOrder(displayOrder == null ? 0 : displayOrder)
            .active(true)
            .build());
  }

  /**
   * Renames a category and fans the new name out to its products.
   *
   * <p>This is the cost of denormalising the category name onto every product
   * (see {@code Product}). It is paid here, once, in a single bulk update rather
   * than a document at a time — and it is worth paying, because the alternative
   * is a join on every product listing in the application forever.
   *
   * <p>The slug deliberately does not change: it is the stable identifier a
   * bookmarked filter relies on.
   */
  @CacheEvict(value = CACHE, allEntries = true)
  public Category rename(String id, String newName) {
    Category category = get(id);
    String trimmed = newName.trim();

    if (trimmed.equals(category.getName())) return category;

    category.setName(trimmed);
    Category saved = categories.save(category);

    long updated =
        mongo
            .updateMulti(
                Query.query(Criteria.where("categoryId").is(id)),
                Update.update("categoryName", trimmed),
                "products")
            .getModifiedCount();

    log.info("Renamed category {} and updated {} product(s)", id, updated);
    return saved;
  }

  /**
   * Deactivates a category.
   *
   * <p>Never deleted: last year's sales reference these products by category,
   * and a report that cannot name what was sold is worthless. Its products stay
   * sellable — pulling a whole shelf off the till because someone tidied the
   * category list would be a far worse surprise.
   */
  @CacheEvict(value = CACHE, allEntries = true)
  public Category deactivate(String id) {
    Category category = get(id);
    category.setActive(false);
    return categories.save(category);
  }

  @CacheEvict(value = CACHE, allEntries = true)
  public Category reorder(String id, int displayOrder) {
    Category category = get(id);
    category.setDisplayOrder(displayOrder);
    return categories.save(category);
  }

  /**
   * "Cement &amp; Sand" becomes "cement-sand".
   *
   * <p>Kept simple and ASCII-only. Sinhala and Tamil category names would need a
   * transliteration step; the shop names its shelves in English today, and
   * guessing at a scheme now would be harder to undo than to add later.
   */
  static String toSlug(String name) {
    String slug =
        name.trim()
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");

    if (slug.isBlank()) {
      throw ApiException.badRequest(
          "INVALID_CATEGORY_NAME", "The category name must contain letters or digits.");
    }
    return slug;
  }
}
