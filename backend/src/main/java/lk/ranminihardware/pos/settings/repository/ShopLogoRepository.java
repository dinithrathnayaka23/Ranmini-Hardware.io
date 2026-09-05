package lk.ranminihardware.pos.settings.repository;

import lk.ranminihardware.pos.settings.domain.ShopLogo;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * The shop's logo bytes.
 *
 * <p>No finders. There is exactly one document, addressed by a fixed id, so
 * everything this needs is already on the base interface.
 */
public interface ShopLogoRepository extends MongoRepository<ShopLogo, String> {}
