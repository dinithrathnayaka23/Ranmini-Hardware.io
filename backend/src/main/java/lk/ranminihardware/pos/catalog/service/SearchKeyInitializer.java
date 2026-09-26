package lk.ranminihardware.pos.catalog.service;

import com.mongodb.client.model.BulkWriteOptions;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Projections;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.model.Updates;
import com.mongodb.client.model.WriteModel;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import lk.ranminihardware.pos.catalog.domain.SearchKeys;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

/**
 * Sets up type-ahead search at startup: fills in missing search keys, then
 * makes sure their index exists.
 *
 * <p>New and edited products get their keys on save. Everything already in the
 * catalogue when this version first starts has none, and would be invisible to
 * search until someone happened to edit it. This fills them in, and finds
 * nothing to do on every start after that.
 *
 * <p><b>Runs while the application starts, before the web server takes
 * requests</b>, so no search can ever run against a half-filled catalogue. The
 * keys are filled in <em>before</em> the index is created, which lets MongoDB
 * build the index in one pass afterwards instead of inserting every entry one
 * update at a time.
 *
 * <p>Lives in the catalogue module rather than with the other indexes in {@code
 * MongoIndexInitializer}, because the index is useless without the backfill and
 * the backfill belongs to the catalogue.
 *
 * <p>The keys are computed here, in Java, with the same {@link SearchKeys} the
 * save hook uses, rather than by a server-side update: MongoDB's own regular
 * expressions split words differently, and two tokenisers would mean search
 * results that depend on whether a product was saved before or after the
 * upgrade.
 *
 * <p>Reads only the three fields the keys come from, writes in unordered
 * batches, and touches only {@code searchKeys}: no version bump and no timestamp.
 */
@Component
public class SearchKeyInitializer {

  /** Pinned by searches in {@code ProductRepositoryImpl}; the names must agree. */
  public static final String INDEX_NAME = "ix_product_search_keys";

  private static final Logger log = LoggerFactory.getLogger(SearchKeyInitializer.class);

  private static final String COLLECTION = "products";
  private static final int BATCH = 1000;
  private static final int PROGRESS_EVERY = 10_000;

  private final MongoTemplate mongo;

  public SearchKeyInitializer(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  @PostConstruct
  public void initialise() {
    try {
      fillMissing();
    } catch (RuntimeException ex) {
      // Never fatal: a shop that cannot find a few products by typing can still
      // sell. Only products still missing keys are read, so the next start
      // simply carries on where this one stopped.
      log.error("Could not add search keys to existing products; will retry on next start", ex);
    }

    try {
      // One entry per word of each product's name, brand and SKU. A search word
      // becomes an anchored prefix (^cem), answered as a bounded range scan.
      mongo
          .indexOps(COLLECTION)
          .createIndex(new Index().on("searchKeys", Sort.Direction.ASC).named(INDEX_NAME));
    } catch (RuntimeException ex) {
      log.error("Could not create the product search index; searches will be slow", ex);
    }
  }

  /**
   * Adds keys to every product that has none.
   *
   * @return how many products were updated
   */
  public long fillMissing() {
    long started = System.currentTimeMillis();
    Bson missing = Filters.exists("searchKeys", false);
    var collection = mongo.getCollection(COLLECTION);

    long pending = collection.countDocuments(missing);
    if (pending == 0) return 0;

    log.info("Adding search keys to {} existing product(s) — a one-time step after upgrading", pending);

    long done = 0;
    List<WriteModel<Document>> batch = new ArrayList<>(BATCH);
    var unordered = new BulkWriteOptions().ordered(false);

    try (var cursor =
        collection
            .find(missing)
            .projection(Projections.include("name", "brand", "sku"))
            .batchSize(BATCH)
            .iterator()) {
      while (cursor.hasNext()) {
        Document product = cursor.next();
        List<String> keys =
            SearchKeys.forProduct(
                product.getString("name"), product.getString("brand"), product.getString("sku"));

        // Guarded on the keys still being missing, so a product saved (and
        // therefore keyed) since it was read is left exactly as the save wrote it.
        batch.add(
            new UpdateOneModel<>(
                Filters.and(Filters.eq("_id", product.get("_id")), missing),
                Updates.set("searchKeys", keys)));

        if (batch.size() == BATCH) {
          done += collection.bulkWrite(batch, unordered).getModifiedCount();
          batch.clear();
          if (done % PROGRESS_EVERY == 0) log.info("  … {} of {}", done, pending);
        }
      }
    }
    if (!batch.isEmpty()) done += collection.bulkWrite(batch, unordered).getModifiedCount();

    log.info("Added search keys to {} product(s) in {} ms", done, System.currentTimeMillis() - started);
    return done;
  }
}
