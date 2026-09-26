package lk.ranminihardware.pos.shared.config;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.schema.JsonSchemaObject;
import org.springframework.data.mongodb.core.index.IndexOperations;
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
      passwordResetTokens();
      auditEvents();
      log.info("MongoDB indexes verified in {} ms", System.currentTimeMillis() - started);
    } catch (RuntimeException ex) {
      // A missing index must not stop the till from opening: the shop can trade
      // slowly, but it cannot trade not at all. Logged loudly so it is fixed.
      log.error("Could not create MongoDB indexes. The service will run, but slowly.", ex);
    }
  }

  /**
   * One index per query shape the product screens actually run.
   *
   * <p>Every list here is sorted by name, and an index only saves the sort when
   * its fields are exactly the query's equality filters followed by name. So
   * each combination the screens use gets its own: without one, MongoDB reads
   * and sorts the whole catalogue in memory — imperceptible at a hundred
   * products, over 300ms at thirty thousand, and on every page view.
   */
  private void products() {
    IndexOperations ops = mongo.indexOps("products");

    // Unique so two products can never share a shelf code, which is what makes
    // a code a usable way to identify one at the counter. Also serves the exact
    // SKU lookups: SKUs are stored upper-case, so no case-insensitive scan.
    ops.createIndex(new Index().on("sku", Sort.Direction.ASC).unique().named("uk_product_sku"));

    // Inventory, unfiltered: the default view of the whole catalogue, by name.
    ops.createIndex(new Index().on("name", Sort.Direction.ASC).named("ix_product_name"));

    // The till's "All items", and the inventory limited to active lines.
    ops.createIndex(
        new Index()
            .on("active", Sort.Direction.ASC)
            .on("name", Sort.Direction.ASC)
            .named("ix_product_active_name"));

    // The till's category chips, and the per-category product counts on the
    // categories screen, which it answers from the index without reading a
    // single product.
    ops.createIndex(
        new Index()
            .on("active", Sort.Direction.ASC)
            .on("categoryId", Sort.Direction.ASC)
            .on("name", Sort.Direction.ASC)
            .named("ix_product_active_category_name"));

    // Inventory filtered to one category (active and withdrawn alike), and
    // finding a category's products when it is renamed or removed.
    ops.createIndex(
        new Index()
            .on("categoryId", Sort.Direction.ASC)
            .on("name", Sort.Direction.ASC)
            .named("ix_product_category_name"));

    // Inventory filtered by stock status, by name.
    ops.createIndex(
        new Index()
            .on("status", Sort.Direction.ASC)
            .on("name", Sort.Direction.ASC)
            .named("ix_product_status_name"));

    // The low-stock and out-of-stock panels: by status, most urgent first.
    ops.createIndex(
        new Index()
            .on("status", Sort.Direction.ASC)
            .on("stock", Sort.Direction.ASC)
            .named("ix_product_status_stock"));

    ops.createIndex(
        new Index()
            .on("active", Sort.Direction.ASC)
            .on("updatedAt", Sort.Direction.DESC)
            .named("ix_product_active_updated"));

    // The type-ahead search index is created by the catalogue module's
    // SearchKeyInitializer, straight after it fills in any missing keys.

    // The text index this replaced matched whole words only, so nothing was
    // found until a word was fully typed. Nothing queries it any more, and an
    // unused index still costs a write on every sale, so it is removed.
    dropIfPresent(ops, "tx_product_search");
  }

  /** Drops an index that has been retired, and says so; absent is fine. */
  private void dropIfPresent(IndexOperations ops, String name) {
    boolean present = ops.getIndexInfo().stream().anyMatch(info -> name.equals(info.getName()));
    if (!present) return;
    ops.dropIndex(name);
    log.info("Dropped retired index {}", name);
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

    // The default listing walks this backwards.
    ops.createIndex(new Index().on("soldAt", Sort.Direction.DESC).named("ix_sale_sold_at"));

    // Date-range listings: the trading day narrows the scan, then the timestamp
    // orders what is left without a separate in-memory sort.
    ops.createIndex(
        new Index()
            .on("businessDate", Sort.Direction.ASC)
            .on("soldAt", Sort.Direction.DESC)
            .named("ix_sale_business_date"));

    // Every report matches completed sales within a range, in that order, so
    // status leads the compound index and the range is served by its second key.
    ops.createIndex(
        new Index()
            .on("status", Sort.Direction.ASC)
            .on("businessDate", Sort.Direction.ASC)
            .named("ix_sale_status_business_date"));

    // "What did this cashier take today" — for shift reconciliation.
    ops.createIndex(
        new Index()
            .on("cashierId", Sort.Direction.ASC)
            .on("soldAt", Sort.Direction.DESC)
            .named("ix_sale_cashier_sold_at"));

    // The notification feed asks for sales voided since a moment. Sparse
    // because only a voided sale carries the field, which on a healthy shop is
    // a tiny fraction of the collection — a full index here would be almost
    // entirely empty entries.
    ops.createIndex(
        new Index()
            .on("voidedAt", Sort.Direction.DESC)
            .sparse()
            .named("ix_sale_voided_at"));

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
    // Deliberately empty. The trading day IS the document id, so the concurrent
    // upsert is already guarded by the primary key and every range query runs on
    // the fastest index the collection has. Kept as a named method rather than
    // omitted, so the next person looking for the index finds the reason.
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

  private void auditEvents() {
    IndexOperations ops = mongo.indexOps("audit_events");

    // The log is only ever read one way: newest first.
    ops.createIndex(
        new Index().on("occurredAt", Sort.Direction.DESC).named("ix_audit_occurred_at"));

    // Entries expire themselves after two years, the same rule the stock
    // ledger follows. An audit log with no expiry grows for ever, and one
    // pruned by a job somebody has to remember to run is pruned by nobody.
    // Two years is long enough to cover an accounting year and the argument
    // about it afterwards.
    ops.createIndex(
        new Index()
            .on("occurredAt", Sort.Direction.ASC)
            .expire(730, TimeUnit.DAYS)
            .named("ttl_audit_occurred_at"));
  }

  private void passwordResetTokens() {
    IndexOperations ops = mongo.indexOps("password_reset_tokens");

    // The only lookup this collection ever serves, and it happens while
    // somebody waits on a page, so it is unique and indexed.
    ops.createIndex(
        new Index().on("tokenHash", Sort.Direction.ASC).unique().named("uk_reset_token_hash"));

    // Finding a person's other outstanding tokens, to invalidate them.
    ops.createIndex(new Index().on("staffId", Sort.Direction.ASC).named("ix_reset_staff"));

    // Expired requests remove themselves. Without this the collection grows for
    // ever on abandoned resets, and it is a collection of ways into accounts —
    // the fewer that linger, the better.
    ops.createIndex(
        new Index()
            .on("expiresAt", Sort.Direction.ASC)
            .expire(0)
            .named("ttl_reset_expires_at"));
  }

  private void staff() {
    IndexOperations ops = mongo.indexOps("staff");
    ops.createIndex(
        new Index().on("username", Sort.Direction.ASC).unique().named("uk_staff_username"));

    /*
     * Unique only among the accounts that actually have an email address.
     *
     * A plain unique index here looks right and is not. The Staff screen creates
     * a cashier from four fields — name, username, role, password — and no email
     * at all, because the owner hands the credentials over in person. A unique
     * index treats every document missing the field as carrying the same (null)
     * value, so the first such cashier saved and the SECOND WAS REJECTED as a
     * duplicate: the owner was told "That record already exists" about an
     * account whose username was unique and whose email did not exist.
     *
     * The partial filter indexes only documents whose email is a string, so two
     * accounts without one no longer collide while two accounts *with* the same
     * one still do. `$type` is used rather than `$exists`, because a filter of
     * `exists: true` would still index a field explicitly set to null, and the
     * operators a partial filter accepts do not include `$ne`.
     */
    createOrReplace(
        ops,
        "uk_staff_email",
        new Index()
            .on("email", Sort.Direction.ASC)
            .unique()
            .partial(
                PartialIndexFilter.of(
                    Criteria.where("email").type(JsonSchemaObject.Type.stringType())))
            .named("uk_staff_email"));

    ops.createIndex(
        new Index()
            .on("status", Sort.Direction.ASC)
            .on("fullName", Sort.Direction.ASC)
            .named("ix_staff_status_name"));

    // Open password-help requests, for the administrators' notification feed.
    // Sparse, so only the few accounts with a request open are in it at all.
    ops.createIndex(
        new Index()
            .on("passwordHelpRequestedAt", Sort.Direction.DESC)
            .sparse()
            .named("ix_staff_password_help"));
  }

  /**
   * Creates an index, replacing one of the same name built to older options.
   *
   * <p>Mongo refuses a create that reuses a name with different options, which
   * is the right default — it stops a redeploy silently changing the guarantees
   * a collection is under. But it also means a definition corrected in code
   * would never reach a database that already has the old one, and the fix
   * would work on every fresh install and on none of the real ones.
   *
   * <p>So the conflict is caught and the old index dropped first. Safe here
   * because it runs at startup, before the service accepts traffic, and on
   * collections small enough that the rebuild is immediate. It is deliberately
   * not the default path: an index is only dropped when Mongo has said, in so
   * many words, that the existing one does not match what the code asks for.
   */
  private void createOrReplace(IndexOperations ops, String name, Index index) {
    try {
      ops.createIndex(index);
    } catch (RuntimeException ex) {
      log.warn("Rebuilding index {} — the existing one was built to older options", name);
      try {
        ops.dropIndex(name);
      } catch (RuntimeException ignored) {
        // Nothing to drop, so the original failure was something else and the
        // retry below will surface it rather than hiding it behind this.
      }
      ops.createIndex(index);
    }
  }
}
