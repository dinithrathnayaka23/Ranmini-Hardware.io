package lk.ranminihardware.pos.catalog.repository;

import com.mongodb.client.model.ReturnDocument;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.TextCriteria;

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
        new Document("_id", productId)
            .append("active", true)
            .append("stock", new Document("$gte", quantity));

    return applyStockChange(filter, -quantity);
  }

  @Override
  public Optional<Product> incrementStock(String productId, int quantity) {
    if (quantity <= 0) return Optional.empty();
    // No stock guard: returning stock must never be refused.
    return applyStockChange(new Document("_id", productId), quantity);
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

  @Override
  public Page<Product> search(ProductSearchCriteria criteria, Pageable pageable) {
    Query query = new Query();

    if (criteria.activeOnly()) {
      query.addCriteria(Criteria.where("active").is(true));
    }
    if (criteria.categoryId() != null && !criteria.categoryId().isBlank()) {
      query.addCriteria(Criteria.where("categoryId").is(criteria.categoryId()));
    }
    if (criteria.status() != null) {
      query.addCriteria(Criteria.where("status").is(criteria.status()));
    }
    if (criteria.hasTerm()) {
      // matchingAny gives OR-of-terms, so "pvc pipe" finds products matching
      // either word — what a cashier half-remembering a name actually needs.
      query.addCriteria(TextCriteria.forDefaultLanguage().matchingAny(criteria.term()));
    }

    // Count first, on the same criteria but without paging. Mongo answers this
    // from the index alone when the filter is covered, so it is far cheaper
    // than it looks.
    long total = mongo.count(Query.of(query).limit(-1).skip(-1), Product.class, COLLECTION);

    query.with(pageable);
    List<Product> content = mongo.find(query, Product.class, COLLECTION);

    return new PageImpl<>(content, pageable, total);
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
