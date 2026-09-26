package lk.ranminihardware.pos.catalog.domain;

import org.springframework.data.mongodb.core.mapping.event.BeforeConvertCallback;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

/**
 * Keeps a product's search keys in step with its name on every save.
 *
 * <p>A callback rather than a line in each service method, because the keys
 * going stale is silent: a renamed product would simply stop being findable by
 * its new name, and nobody would know why. Hooking the save itself means there
 * is no write path — service, import, seeder, or one added next year — that can
 * forget.
 *
 * <p>Atomic stock updates bypass this on purpose: they change only the stock,
 * never a word anyone searches by.
 */
@Component
public class SearchKeysOnSave implements BeforeConvertCallback<Product> {

  @Override
  @NonNull
  public Product onBeforeConvert(@NonNull Product product, @NonNull String collection) {
    product.refreshSearchKeys();
    return product;
  }
}
