package lk.ranminihardware.pos.catalog.repository;

import java.util.Optional;
import lk.ranminihardware.pos.catalog.domain.ProductImage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

/**
 * Product photographs, addressed by product id.
 *
 * <p>Deliberately nothing but the inherited by-id operations. This collection is
 * only ever read one document at a time, by the endpoint serving a single
 * picture — a query that returned several would be loading megabytes of image
 * bytes to answer a question the product documents can already answer.
 */
public interface ProductImageRepository extends MongoRepository<ProductImage, String> {

  /**
   * A picture's thumbnail fields only, without the full-size original.
   *
   * <p>A till page asks for sixty thumbnails at once. Reading each whole
   * document would pull up to a megabyte from the database to send back a few
   * kilobytes.
   */
  @Query(value = "{ '_id': ?0 }", fields = "{ 'thumbnail': 1, 'thumbnailType': 1, 'contentType': 1 }")
  Optional<ProductImage> findThumbnailById(String id);
}
