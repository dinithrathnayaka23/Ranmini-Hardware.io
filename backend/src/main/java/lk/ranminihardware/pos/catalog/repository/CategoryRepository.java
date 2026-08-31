package lk.ranminihardware.pos.catalog.repository;

import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.catalog.domain.Category;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Category persistence.
 *
 * The collection is small and read constantly — the till asks for it on every
 * load — so the service caches the result rather than adding query complexity
 * here.
 */
public interface CategoryRepository extends MongoRepository<Category, String> {

  List<Category> findByActiveIsTrueOrderByDisplayOrderAscNameAsc();

  Optional<Category> findBySlug(String slug);

  boolean existsBySlug(String slug);
}
