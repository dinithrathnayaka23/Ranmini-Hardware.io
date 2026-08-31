package lk.ranminihardware.pos.shared.config;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.TextIndexDefinition;
import org.springframework.stereotype.Component;

/**
 * Declares every index this service relies on, in one reviewable place.
 *
 * <p>Spring's automatic index creation is switched off in {@code
 * application.yml} on purpose. It builds indexes lazily, the first time a
 * collection is touched, which on a large collection means an unannounced
 * foreground build in the middle of a trading day. Declaring them here instead
 * means the set is code — reviewable, diffable, and applied at startup before
 * traffic arrives.
 *
 * <p><b>Rule for this file:</b> every query in the service must be served by an
 * index listed here. A collection scan is invisible on the seed data and fatal
 * on a year of sales, so new query shapes come with a new index or they do not
 * ship.
 *
 * <p>Index creation is idempotent — Mongo ignores a create for an index that
 * already exists — so this runs safely on every boot.
 */
@Component
public class MongoIndexInitializer {

  private static final Logger log = LoggerFactory.getLogger(MongoIndexInitializer.class);

  private final MongoTemplate mongo;

  public MongoIndexInitializer(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  @PostConstruct
  public void createIndexes() {
    long started = System.currentTimeMillis();
    try {
      products();
      categories();
      sales();
      dailySalesSummary();
      stockMovements();
      staff();
      log.info("MongoDB indexes verified in {} ms", System.currentTimeMillis() - started);
    } catch (RuntimeException ex) {
      // A missing index must not stop the till from opening: the shop can trade
      // slowly, but it cannot trade not at all. Logged loudly so it is fixed.
      log.error("Could not create MongoDB indexes. The service will run, but slowly.", ex);
    }
  }

  private void products() {
    IndexOperations ops = mongo.indexOps("products");

    // The barcode path. A cashier scanning at the counter hits this on every
    // item, so it is unique and it is the fastest lookup in the system.
    ops.createIndex(new Index().on("sku", Sort.Direction.ASC).unique().named("uk_product_sku"));

    // The till's catalogue: filter by category, order by name. Compound and in
    // this order so the same index serves "all items" (sorted by name) via its
    // prefix and a single category without a re-sort.
    ops.createIndex(
        new Index()
            .on("categoryId", Sort.Direction.ASC)
            .on("name", Sort.Direction.ASC)
            .named("ix_product_category_name"));

    // Powers the low-stock and out-of-stock dashboard panels, which would
    // otherwise scan the whole catalogue to count a handful of rows.
    ops.createIndex(
        new Index()
            .on("status", Sort.Direction.ASC)
            .on("stock", Sort.Direction.ASC)
            .named("ix_product_status_stock"));

    // Only active products are sellable, and the till never asks for the rest.
    ops.createIndex(
        new Index()
            .on("active", Sort.Direction.ASC)
            .on("updatedAt", Sort.Direction.DESC)
            .named("ix_product_active_updated"));

    // Free-text search over the name and SKU, for the admin inventory table.
    // A text index rather than a regex: an unanchored regex cannot use a normal
    // index at all and degrades to a full scan on every keystroke.
    ops.createIndex(
        TextIndexDefinition.builder()
            .onField("name", 3F)
            .onField("sku", 2F)
            .onField("brand", 1F)
            .named("tx_product_search")
            .build());
  }

  private void categories() {
    IndexOperations ops = mongo.indexOps("categories");
    ops.createIndex(new Index().on("slug", Sort.Direction.ASC).unique().named("uk_category_slug"));
    ops.createIndex(
        new Index()
            .on("active", Sort.Direction.ASC)
            .on("displayOrder", Sort.Direction.ASC)
            .named("ix_category_active_order"));
  }

  private void sales() {
    IndexOperations ops = mongo.indexOps("sales");

    ops.createIndex(
        new Index().on("invoiceNumber", Sort.Direction.ASC).unique().named("uk_sale_invoice"));

    // The default listing and every date-range report walk this backwards.
    ops.createIndex(new Index().on("soldAt", Sort.Direction.DESC).named("ix_sale_sold_at"));

    // "What did this cashier take today" — for shift reconciliation.
    ops.createIndex(
        new Index()
            .on("cashierId", Sort.Direction.ASC)
            .on("soldAt", Sort.Direction.DESC)
            .named("ix_sale_cashier_sold_at"));

    // Lets a refund or a receipt reprint find the sale a line item belongs to
    // without scanning; multikey over the embedded array.
    ops.createIndex(
        new Index().on("lines.productId", Sort.Direction.ASC).named("ix_sale_line_product"));

    // Idempotency: a till that retries a checkout after a network timeout must
    // not create a second sale. Sparse, because only retried requests carry a
    // key, and unique so the second attempt is rejected by the database rather
    // than by a check that could race.
    ops.createIndex(
        new Index()
            .on("idempotencyKey", Sort.Direction.ASC)
            .unique()
            .sparse()
            .named("uk_sale_idempotency"));
  }

  private void dailySalesSummary() {
    IndexOperations ops = mongo.indexOps("daily_sales_summary");
    // One document per trading day, upserted as sales land. The unique index is
    // what makes the concurrent upsert safe.
    ops.createIndex(new Index().on("date", Sort.Direction.DESC).unique().named("uk_summary_date"));
  }

  private void stockMovements() {
    IndexOperations ops = mongo.indexOps("stock_movements");

    ops.createIndex(
        new Index()
            .on("productId", Sort.Direction.ASC)
            .on("occurredAt", Sort.Direction.DESC)
            .named("ix_movement_product_time"));

    // The audit trail is the fastest-growing collection in the system and the
    // least useful once it is old, so it expires itself after two years rather
    // than being pruned by a job somebody has to remember to run.
    ops.createIndex(
        new Index()
            .on("occurredAt", Sort.Direction.ASC)
            .expire(730, TimeUnit.DAYS)
            .named("ttl_movement_occurred_at"));
  }

  private void staff() {
    IndexOperations ops = mongo.indexOps("staff");
    ops.createIndex(
        new Index().on("username", Sort.Direction.ASC).unique().named("uk_staff_username"));
    ops.createIndex(new Index().on("email", Sort.Direction.ASC).unique().named("uk_staff_email"));
    ops.createIndex(
        new Index()
            .on("status", Sort.Direction.ASC)
            .on("fullName", Sort.Direction.ASC)
            .named("ix_staff_status_name"));
  }
}
