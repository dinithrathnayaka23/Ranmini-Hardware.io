package lk.ranminihardware.pos.settings.repository;

import lk.ranminihardware.pos.settings.domain.ShopSettings;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Settings persistence.
 *
 * No finders beyond the inherited findById: there is exactly one document, at a
 * fixed id, so anything else would be a query looking for a second shop that
 * does not exist.
 */
public interface ShopSettingsRepository extends MongoRepository<ShopSettings, String> {}
