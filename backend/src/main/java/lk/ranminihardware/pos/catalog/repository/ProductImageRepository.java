package lk.ranminihardware.pos.catalog.repository;

import lk.ranminihardware.pos.catalog.domain.ProductImage;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Product photographs, addressed by product id.
 *
 * <p>Deliberately nothing but the inherited by-id operations. This collection is
 * only ever read one document at a time, by the endpoint serving a single
 * picture — a query that returned several would be loading megabytes of image
 * bytes to answer a question the product documents can already answer.
 */
public interface ProductImageRepository extends MongoRepository<ProductImage, String> {}
