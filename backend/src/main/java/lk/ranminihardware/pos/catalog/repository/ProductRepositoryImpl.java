package lk.ranminihardware.pos.catalog.repository;

import com.mongodb.client.model.BulkWriteOptions;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.ReturnDocument;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.model.WriteModel;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.SearchKeys;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductDetails;
import lk.ranminihardware.pos.catalog.repository.dto.ProductDetailsUpdate;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.mongodb.BulkOperationException;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

/**
 * Hand-written product queries. See {@link ProductRepositoryCustom} for why
 * each one exists.
 */
public class ProductRepositoryImpl implements ProductRepositoryCustom {

  private static final String COLLECTION = "products";

  private final MongoTemplate mongo;

  public ProductRepositoryImpl(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  @Override
  public Optional<Product> decrementStock(String productId, int quantity) {
    if (quantity <= 0) return Optional.empty();

    // The guard lives in the filter, not in Java. Mongo evaluates the match and
    // the update as one atomic step, so two tills racing for the last unit
    // cannot both satisfy `stock >= quantity`.
    Document filter =
        new Document("_id", idValue(productId))
            .append("active", true)
            .append("stock", new Document("$gte", quantity));

    return applyStockChange(filter, -quantity);
  }

  @Override
  public Optional<Product> incrementStock(String productId, int quantity) {
    if (quantity <= 0) return Optional.empty();
    // No stock guard: returning stock must never be refused.
    return applyStockChange(new Document("_id", idValue(productId)), quantity);
  }

  /**
   * Applies a stock delta and recomputes the stored status in one round trip.
   *
   * <p>Written as an aggregation pipeline update (Mongo 4.2+) rather than a
   * plain {@code $inc}, because the status depends on the <em>new</em> stock
   * value. Doing it any other way means reading the document back and issuing a
   * second write, which reintroduces exactly the race the conditional update
   * was there to close.
   *
   * <p>The driver is used directly here rather than Spring's {@code Update}
   * builder: this is the hottest write in the system and the pipeline is easier
   * to read — and to compare against the shell — spelled out as BSON.
   */
  private Optional<Product> applyStockChange(Document filter, int delta) {
    List<Document> pipeline =
        List.of(
            new Document(
                "$set", new Document("stock", new Document("$add", List.of("$stock", delta)))),
            new Document(
                "$set",
                new Document("status", statusExpression())
                    .append("updatedAt", Instant.now())));

    Document updated =
        mongo
            .getCollection(COLLECTION)
            .findOneAndUpdate(
                filter,
                pipeline,
                new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER));

    // Null means the filter matched nothing: missing, inactive, or not enough
    // stock. The caller is not told which, because the answer to all three is
    // the same and distinguishing them would leak catalogue state.
    return Optional.ofNullable(updated)
        .map(doc -> mongo.getConverter().read(Product.class, doc));
  }

  /**
   * Converts an id string into the type it is actually stored as.
   *
   * <p>Spring Data maps a hex string id onto a real {@code ObjectId} in the
   * database, so a raw-driver filter built with the plain {@code String} matches
   * nothing at all. That failure is silent and looks exactly like "no stock" —
   * which is precisely how it first showed up: a sale of two units from a shelf
   * of four was refused. Anything that is not a valid ObjectId is passed through
   * unchanged, so seeded or externally supplied string ids still work.
   */
  private static Object idValue(String id) {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
  }

  /**
   * The stored {@code status} expressed as a Mongo switch over the new stock.
   *
   * <p>This mirrors {@link StockStatus#of(int, int)} exactly. The duplication is
   * unavoidable — one copy runs in Java, one inside the database — so any change
   * to the rule has to be made in both, which is why they carry each other's
   * names.
   */
  private static Document statusExpression() {
    return new Document(
        "$switch",
        new Document(
                "branches",
                List.of(
                    new Document("case", new Document("$lte", List.of("$stock", 0)))
                        .append("then", StockStatus.OUT_OF_STOCK.name()),
                    new Document(
                            "case",
                            new Document("$lte", List.of("$stock", "$reorderLevel")))
                        .append("then", StockStatus.LOW_STOCK.name())))
            .append("default", StockStatus.IN_STOCK.name()));
  }

  /**
   * The name of the search-key index, pinned by searches that carry words.
   *
   * <p>Pinned because the planner's choice is not stable here. With a word
   * <em>and</em> a sort by name, it can prefer walking the name index and
   * testing each product against the word — fast for a common word, a scan of
   * the whole catalogue for a rare one, and whichever it picks first it caches.
   * Going through the key index always touches only the products that match.
   */
  static final String SEARCH_KEYS_INDEX = "ix_product_search_keys"; // see SearchKeyInitializer

  @Override
  public Page<Product> search(ProductSearchCriteria criteria, Pageable pageable) {
    Built built = build(criteria);
    long total = count(built.query(), built.unfiltered());

    Query query = built.query().with(pageable);
    return new PageImpl<>(mongo.find(query, Product.class, COLLECTION), pageable, total);
  }

  @Override
  public Slice<Product> searchSlice(ProductSearchCriteria criteria, Pageable pageable) {
    Query query = build(criteria).query().with(pageable);
    // One row past the page: its presence is the answer to "is there more".
    query.limit(pageable.getPageSize() + 1);

    List<Product> rows = mongo.find(query, Product.class, COLLECTION);
    boolean hasNext = rows.size() > pageable.getPageSize();
    List<Product> content = hasNext ? rows.subList(0, pageable.getPageSize()) : rows;
    return new SliceImpl<>(content, pageable, hasNext);
  }

  /** A search's filter, before paging, and whether it filters anything at all. */
  private record Built(Query query, boolean unfiltered) {}

  private Built build(ProductSearchCriteria criteria) {
    List<Criteria> filters = new ArrayList<>();

    if (criteria.activeOnly()) {
      filters.add(Criteria.where("active").is(true));
    }
    if (criteria.categoryId() != null && !criteria.categoryId().isBlank()) {
      filters.add(Criteria.where("categoryId").is(criteria.categoryId()));
    }
    if (criteria.status() != null) {
      filters.add(Criteria.where("status").is(criteria.status()));
    }

    // Every word must match the start of one of the product's words: "port
    // cem" finds Portland Cement, and nothing that merely mentions ports.
    List<String> terms = criteria.hasTerm() ? SearchKeys.termsOf(criteria.term()) : List.of();
    for (String term : terms) {
      filters.add(Criteria.where("searchKeys").regex("^" + escapeRegex(term)));
    }

    Query query = filters.isEmpty() ? new Query() : new Query(new Criteria().andOperator(filters));
    if (!terms.isEmpty()) query.withHint(SEARCH_KEYS_INDEX);

    // A sort the indexes do not cover — by price, say — is done in memory, and
    // MongoDB refuses one over 100MB outright. Letting it spill to disk trades
    // that failure for a slower answer, which is the right trade at any size.
    query.allowDiskUse(true);
    return new Built(query, filters.isEmpty());
  }

  /**
   * How many products match, for the pager.
   *
   * <p>With no filter at all the answer comes from collection metadata instead
   * of a count, which would otherwise read every document on the busiest view of
   * the inventory screen — the unfiltered first page.
   */
  private long count(Query query, boolean unfiltered) {
    if (unfiltered) return mongo.estimatedCount(COLLECTION);
    return mongo.count(Query.of(query).limit(-1).skip(-1), Product.class, COLLECTION);
  }

  /**
   * Escapes a term for use inside a regular expression.
   *
   * <p>{@link SearchKeys#termsOf} already yields letters and digits only, so
   * this changes nothing today. It is here so that no future change to the
   * tokeniser can turn a search box into a way of sending the database an
   * arbitrary — possibly catastrophically slow — pattern.
   */
  private static String escapeRegex(String term) {
    return term.replaceAll("[\\\\^$.|?*+()\\[\\]{}]", "\\\\$0");
  }

  @Override
  public List<String> insertAll(List<Product> products) {
    if (products.isEmpty()) return List.of();
    try {
      mongo.bulkOps(BulkOperations.BulkMode.UNORDERED, Product.class, COLLECTION)
          .insert(products)
          .execute();
      return List.of();
    } catch (BulkOperationException ex) {
      // Unordered, so everything else went in. The failures are SKUs someone
      // created between the import's check and this write; anything other than
      // a duplicate is a real fault and is not swallowed.
      List<String> duplicates = new ArrayList<>();
      for (var error : ex.getErrors()) {
        if (error.getCode() != DUPLICATE_KEY) throw ex;
        duplicates.add(products.get(error.getIndex()).getSku());
      }
      return duplicates;
    }
  }

  @Override
  public long updateDetails(List<ProductDetailsUpdate> updates) {
    if (updates.isEmpty()) return 0;
    Instant now = Instant.now();

    List<WriteModel<Document>> writes = new ArrayList<>(updates.size());
    for (ProductDetailsUpdate u : updates) {
      // Every value goes through $literal: in an update pipeline a plain string
      // starting with "$" is read as a field reference, so a product named
      // "$5 Tool" would otherwise copy some other field into its name.
      Document set =
          new Document("name", literal(u.name()))
              .append("brand", literal(u.brand()))
              .append("categoryId", literal(u.categoryId()))
              .append("categoryName", literal(u.categoryName()))
              .append("unit", literal(u.unit()))
              .append("buyingPrice", literal(new Decimal128(u.buyingPrice())))
              .append("sellingPrice", literal(new Decimal128(u.sellingPrice())))
              .append("reorderLevel", literal(u.reorderLevel()))
              .append("searchKeys", literal(u.searchKeys()))
              .append("updatedAt", literal(now))
              // Bumped so an edit made from a copy read before the import is
              // refused as stale, rather than silently undoing the import.
              .append(
                  "version",
                  new Document("$add", List.of(new Document("$ifNull", List.of("$version", 0L)), 1L)));

      writes.add(
          new UpdateOneModel<>(
              new Document("sku", u.sku()),
              List.of(
                  new Document("$set", set),
                  // After the first stage, so the status follows the new level.
                  new Document("$set", new Document("status", statusExpression())))));
    }

    return mongo
        .getCollection(COLLECTION)
        .bulkWrite(writes, new BulkWriteOptions().ordered(false))
        .getModifiedCount();
  }

  @Override
  public Map<String, ProductDetails> detailsBySku(Collection<String> skus) {
    if (skus.isEmpty()) return Map.of();
    Map<String, ProductDetails> found = new HashMap<>();
    mongo
        .getCollection(COLLECTION)
        .find(new Document("sku", new Document("$in", List.copyOf(skus))))
        .projection(
            new Document("_id", 0)
                .append("sku", 1)
                .append("name", 1)
                .append("brand", 1)
                .append("categoryId", 1)
                .append("unit", 1)
                .append("buyingPrice", 1)
                .append("sellingPrice", 1)
                .append("reorderLevel", 1))
        .forEach(
            doc ->
                found.put(
                    doc.getString("sku"),
                    new ProductDetails(
                        doc.getString("name"),
                        doc.getString("brand"),
                        doc.getString("categoryId"),
                        doc.getString("unit"),
                        decimalValue(doc.get("buyingPrice")),
                        decimalValue(doc.get("sellingPrice")),
                        doc.getInteger("reorderLevel", 0))));
    return found;
  }

  private static final int DUPLICATE_KEY = 11000;

  private static Document literal(Object value) {
    return new Document("$literal", value);
  }

  @Override
  public InventorySummary summarise() {
    // $group over the active catalogue: four figures, one pass, nothing loaded
    // into the application. `$cond` counts each status without a second query.
    List<Document> pipeline =
        List.of(
            new Document("$match", new Document("active", true)),
            new Document(
                "$group",
                new Document("_id", null)
                    .append("totalProducts", new Document("$sum", 1))
                    .append(
                        "lowStockItems",
                        new Document(
                            "$sum",
                            conditionalOne(
                                new Document(
                                    "$eq",
                                    List.of("$status", StockStatus.LOW_STOCK.name())))))
                    .append(
                        "outOfStockItems",
                        new Document(
                            "$sum",
                            conditionalOne(
                                new Document(
                                    "$eq",
                                    List.of("$status", StockStatus.OUT_OF_STOCK.name())))))
                    .append(
                        "retailValue",
                        new Document(
                            "$sum",
                            new Document("$multiply", List.of("$sellingPrice", "$stock"))))
                    .append(
                        "costValue",
                        new Document(
                            "$sum",
                            new Document("$multiply", List.of("$buyingPrice", "$stock"))))));

    Document result =
        mongo.getCollection(COLLECTION).aggregate(pipeline).first();

    if (result == null) return InventorySummary.empty();

    return new InventorySummary(
        longValue(result.get("totalProducts")),
        longValue(result.get("lowStockItems")),
        longValue(result.get("outOfStockItems")),
        decimalValue(result.get("retailValue")),
        decimalValue(result.get("costValue")));
  }

  private static Document conditionalOne(Document condition) {
    return new Document("$cond", List.of(condition, 1, 0));
  }

  private static long longValue(Object value) {
    return value instanceof Number number ? number.longValue() : 0L;
  }

  /**
   * Aggregation results come back as whatever type the arithmetic produced —
   * {@code Decimal128} for money, but an {@code Integer} zero for an empty
   * catalogue. Normalising here keeps that detail out of the service layer.
   */
  private static BigDecimal decimalValue(Object value) {
    if (value instanceof Decimal128 decimal) return decimal.bigDecimalValue();
    if (value instanceof BigDecimal decimal) return decimal;
    if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
    return BigDecimal.ZERO;
  }
}
