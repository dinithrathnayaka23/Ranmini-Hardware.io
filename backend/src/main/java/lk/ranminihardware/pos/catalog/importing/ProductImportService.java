package lk.ranminihardware.pos.catalog.importing;

import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.IntConsumer;
import java.util.regex.Pattern;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.repository.dto.ProductDetails;
import lk.ranminihardware.pos.catalog.repository.dto.ProductDetailsUpdate;
import lk.ranminihardware.pos.catalog.service.CategoryService;
import lk.ranminihardware.pos.catalog.service.InventorySummaryCache;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.money.Money;
import org.springframework.stereotype.Service;

/**
 * Adds and updates products in bulk from a spreadsheet saved as CSV.
 *
 * <p>Two steps, and the first never writes. {@link #plan} reads and checks the
 * whole file — every row validated by the same rules as the product form, every
 * SKU compared against the catalogue — and reports what would happen. {@link
 * #execute} then carries a plan out in batches. The owner sees the problems in a
 * thirty-thousand-line file before any of it lands, not after half of it has.
 *
 * <p><b>Matched by SKU.</b> A SKU already in the catalogue updates that product;
 * a new one creates a product. Existing products never have their stock changed
 * by an import — see {@link ProductDetailsUpdate} for why — so the stock column
 * is used only for new products, as their opening stock.
 *
 * <p><b>Bad rows are skipped, not fatal.</b> Each is reported with its line
 * number and the reason, and the rest of the file still goes in. A single typo
 * in one price should not block twenty-nine thousand good rows.
 */
@Service
public class ProductImportService {

  /** The largest file accepted: comfortably over thirty thousand products. */
  public static final int MAX_ROWS = 50_000;

  /** Rows written per database round trip. */
  private static final int BATCH = 1000;

  /** Problems listed back to the owner; the rest are counted, not listed. */
  private static final int MAX_LISTED_ERRORS = 200;

  // The same limits as the product form, so an imported product is held to the
  // same standard as one typed in by hand.
  private static final Pattern SKU = Pattern.compile("^[A-Za-z0-9._/-]{1,40}$");
  private static final int MAX_NAME = 160;
  private static final int MAX_BRAND = 80;
  private static final int MAX_UNIT = 16;
  private static final int MAX_CATEGORY = 80;
  private static final BigDecimal MAX_PRICE = new BigDecimal("9999999999.99");
  private static final int MAX_STOCK = 10_000_000;
  private static final int MAX_REORDER = 1_000_000;

  /**
   * Spreadsheet headings accepted for each column, compared after lower-casing
   * and removing everything but letters and digits — so "Selling Price",
   * "selling_price" and "SELLINGPRICE" all mean the same thing.
   */
  private static final Map<String, Column> HEADINGS = headings();

  private final ProductRepository products;
  private final CategoryService categories;
  private final InventorySummaryCache summary;
  private final Clock clock;

  public ProductImportService(
      ProductRepository products,
      CategoryService categories,
      InventorySummaryCache summary,
      Clock clock) {
    this.products = products;
    this.categories = categories;
    this.summary = summary;
    this.clock = clock;
  }

  // ---------------------------------------------------------------------------
  // Planning: read and check, write nothing
  // ---------------------------------------------------------------------------

  /**
   * Reads the file and works out what an import would do.
   *
   * @throws ApiException when the file as a whole cannot be used — not CSV, no
   *     heading row, a required column missing, or over the size limits
   */
  public ImportPlan plan(Reader csv) {
    CsvReader reader = new CsvReader(csv, MAX_ROWS + 1);
    try {
      List<String> heading = reader.next();
      while (heading != null && heading.isEmpty()) heading = reader.next();
      if (heading == null) throw invalid("EMPTY_FILE", "The file is empty.");

      Map<Column, Integer> columns = mapColumns(heading);

      Map<String, Category> existingCategories = new HashMap<>();
      for (Category category : categories.listAll()) {
        existingCategories.put(category.getSlug(), category);
      }

      List<ImportRow> rows = new ArrayList<>();
      List<RowError> errors = new ArrayList<>();
      int errorCount = 0;
      Map<String, Integer> firstLineOfSku = new HashMap<>();
      Map<String, String> newCategories = new LinkedHashMap<>();

      int line = 1;
      List<String> fields;
      while ((fields = reader.next()) != null) {
        line++;
        if (fields.isEmpty() || fields.stream().allMatch(String::isBlank)) continue;

        try {
          ImportRow row = parseRow(line, fields, columns);

          Integer earlier = firstLineOfSku.putIfAbsent(row.sku(), line);
          if (earlier != null) {
            throw new RowProblem("SKU %s already appears on line %d.".formatted(row.sku(), earlier));
          }

          String slug = slugOf(row.category());
          if (!existingCategories.containsKey(slug)) newCategories.putIfAbsent(slug, row.category());

          rows.add(row);
        } catch (RowProblem problem) {
          errorCount++;
          if (errors.size() < MAX_LISTED_ERRORS) errors.add(new RowError(line, problem.getMessage()));
        }
      }

      if (rows.isEmpty() && errorCount == 0) {
        throw invalid("NO_ROWS", "The file has a heading row but no products under it.");
      }

      // Which rows update an existing product, and which of those would change
      // nothing. Re-importing an exported catalogue with a few prices corrected
      // is the common case, and writing thirty thousand identical products to
      // change twelve is most of what made it slow.
      Set<String> existing = new HashSet<>();
      Set<String> unchanged = new HashSet<>();
      for (int i = 0; i < rows.size(); i += BATCH) {
        List<ImportRow> batch = rows.subList(i, Math.min(i + BATCH, rows.size()));
        Map<String, ProductDetails> stored =
            products.detailsBySku(batch.stream().map(ImportRow::sku).toList());
        for (ImportRow row : batch) {
          ProductDetails current = stored.get(row.sku());
          if (current == null) continue;
          existing.add(row.sku());
          Category category = existingCategories.get(slugOf(row.category()));
          if (category != null && sameAs(row, category.getId(), current)) unchanged.add(row.sku());
        }
      }

      return new ImportPlan(rows, existing, unchanged, newCategories, errors, errorCount);
    } catch (CsvReader.CsvException ex) {
      throw invalid("INVALID_CSV", ex.getMessage());
    } catch (IOException ex) {
      throw invalid("UNREADABLE_FILE", "The file could not be read.");
    }
  }

  /** Whether importing this row would leave the stored product exactly as it is. */
  private static boolean sameAs(ImportRow row, String categoryId, ProductDetails current) {
    return row.name().equals(current.name())
        && Objects.equals(emptyToNull(row.brand()), emptyToNull(current.brand()))
        && categoryId.equals(current.categoryId())
        && row.unit().equals(current.unit())
        && sameAmount(row.buyingPrice(), current.buyingPrice())
        && sameAmount(row.sellingPrice(), current.sellingPrice())
        && row.reorderLevel() == current.reorderLevel();
  }

  private static boolean sameAmount(BigDecimal a, BigDecimal b) {
    return a != null && b != null && a.compareTo(b) == 0;
  }

  private static String emptyToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private static Map<Column, Integer> mapColumns(List<String> heading) {
    Map<Column, Integer> columns = new HashMap<>();
    for (int i = 0; i < heading.size(); i++) {
      Column column = HEADINGS.get(normaliseHeading(heading.get(i)));
      if (column != null) columns.putIfAbsent(column, i);
    }

    List<String> missing = new ArrayList<>();
    for (Column column : Column.values()) {
      if (column.required && !columns.containsKey(column)) missing.add(column.label);
    }
    if (!missing.isEmpty()) {
      throw invalid(
          "MISSING_COLUMNS",
          "The heading row is missing: %s. Download the template to see the expected columns."
              .formatted(String.join(", ", missing)));
    }
    return columns;
  }

  private static ImportRow parseRow(int line, List<String> fields, Map<Column, Integer> columns) {
    String sku = text(fields, columns, Column.SKU).toUpperCase(Locale.ROOT);
    if (sku.isEmpty()) throw new RowProblem("SKU is empty.");
    if (!SKU.matcher(sku).matches()) {
      throw new RowProblem("SKU \"%s\" must be up to 40 letters, digits and . _ / -.".formatted(clip(sku)));
    }

    String name = text(fields, columns, Column.NAME);
    if (name.isEmpty()) throw new RowProblem("Name is empty.");
    if (name.length() > MAX_NAME) throw new RowProblem("Name is longer than %d characters.".formatted(MAX_NAME));

    String category = text(fields, columns, Column.CATEGORY);
    if (category.isEmpty()) throw new RowProblem("Category is empty.");
    if (category.length() > MAX_CATEGORY) throw new RowProblem("Category name is too long.");
    if (slugOf(category) == null) throw new RowProblem("Category must contain letters or digits.");

    String brand = text(fields, columns, Column.BRAND);
    if (brand.length() > MAX_BRAND) throw new RowProblem("Brand is longer than %d characters.".formatted(MAX_BRAND));

    String unit = text(fields, columns, Column.UNIT);
    if (unit.length() > MAX_UNIT) throw new RowProblem("Unit is longer than %d characters.".formatted(MAX_UNIT));

    BigDecimal buying = price(fields, columns, Column.BUYING_PRICE);
    BigDecimal selling = price(fields, columns, Column.SELLING_PRICE);
    int stock = whole(fields, columns, Column.STOCK, MAX_STOCK);
    int reorder = whole(fields, columns, Column.REORDER_LEVEL, MAX_REORDER);

    return new ImportRow(
        line, sku, name, brand.isEmpty() ? null : brand, category,
        unit.isEmpty() ? "pcs" : unit, buying, selling, stock, reorder);
  }

  // ---------------------------------------------------------------------------
  // Execution: carry a plan out in batches
  // ---------------------------------------------------------------------------

  /**
   * Writes a plan: creates missing categories, inserts new products, and
   * updates existing ones, a batch at a time.
   *
   * @param progress told the running total of rows written after each batch
   */
  public ImportOutcome execute(ImportPlan plan, IntConsumer progress) {
    Map<String, Category> bySlug = new HashMap<>();
    for (Category category : categories.listAll()) bySlug.put(category.getSlug(), category);

    List<String> categoriesCreated = new ArrayList<>();
    for (var entry : plan.newCategories().entrySet()) {
      if (bySlug.containsKey(entry.getKey())) continue;
      try {
        Category created = categories.create(entry.getValue(), null);
        bySlug.put(created.getSlug(), created);
        categoriesCreated.add(created.getName());
      } catch (ApiException ex) {
        // Created by someone else a moment ago; use theirs.
        for (Category category : categories.listAll()) bySlug.put(category.getSlug(), category);
        if (!bySlug.containsKey(entry.getKey())) throw ex;
      }
    }

    Instant now = Instant.now(clock);
    int written = 0;
    long created = 0;
    long updated = 0;
    List<RowError> conflicts = new ArrayList<>();

    // Unchanged rows are not written at all; they still count towards progress.
    List<ImportRow> rows = plan.rows();
    for (int i = 0; i < rows.size(); i += BATCH) {
      List<ImportRow> batch = rows.subList(i, Math.min(i + BATCH, rows.size()));

      List<Product> inserts = new ArrayList<>();
      List<ProductDetailsUpdate> updates = new ArrayList<>();
      Map<String, Integer> lineOfSku = new HashMap<>();

      for (ImportRow row : batch) {
        Category category = bySlug.get(slugOf(row.category()));
        lineOfSku.put(row.sku(), row.line());

        if (plan.unchangedSkus().contains(row.sku())) continue;

        if (plan.existingSkus().contains(row.sku())) {
          Product keyed = Product.builder().name(row.name()).brand(row.brand()).sku(row.sku()).build();
          keyed.refreshSearchKeys();
          updates.add(
              new ProductDetailsUpdate(
                  row.sku(), row.name(), row.brand(), category.getId(), category.getName(),
                  row.unit(), row.buyingPrice(), row.sellingPrice(), row.reorderLevel(),
                  keyed.getSearchKeys()));
        } else {
          Product product =
              Product.builder()
                  .sku(row.sku())
                  .name(row.name())
                  .brand(row.brand())
                  .categoryId(category.getId())
                  .categoryName(category.getName())
                  .unit(row.unit())
                  .buyingPrice(row.buyingPrice())
                  .sellingPrice(row.sellingPrice())
                  .stock(row.stock())
                  .reorderLevel(row.reorderLevel())
                  .active(true)
                  // Set here rather than left to auditing and versioning, which
                  // a bulk insert does not run. A null version would make the
                  // first ordinary save of this product an insert — and fail.
                  .createdAt(now)
                  .updatedAt(now)
                  .version(0L)
                  .build();
          product.refreshStatus();
          product.refreshSearchKeys();
          inserts.add(product);
        }
      }

      List<String> duplicates = products.insertAll(inserts);
      for (String sku : duplicates) {
        conflicts.add(new RowError(lineOfSku.get(sku), "SKU %s was created by someone else during the import.".formatted(sku)));
      }
      created += inserts.size() - duplicates.size();
      updated += products.updateDetails(updates);

      written += batch.size();
      progress.accept(written);
    }

    // Totals include the new products straight away rather than after the cache
    // expires — the owner is looking at the screen that shows them.
    summary.invalidate();

    return new ImportOutcome(created, updated, categoriesCreated, conflicts);
  }

  // ---------------------------------------------------------------------------
  // Field parsing
  // ---------------------------------------------------------------------------

  private static String text(List<String> fields, Map<Column, Integer> columns, Column column) {
    Integer index = columns.get(column);
    if (index == null || index >= fields.size()) return "";
    return fields.get(index).strip();
  }

  /**
   * A price as a spreadsheet writes it: "1250", "1,250.00", "Rs. 1,250.00".
   * Thousands separators and a currency prefix are dropped; anything else that
   * is not a number is a problem with that row.
   */
  private static BigDecimal price(List<String> fields, Map<Column, Integer> columns, Column column) {
    String raw = text(fields, columns, column);
    if (raw.isEmpty()) throw new RowProblem("%s is empty.".formatted(column.label));

    String cleaned = raw.replaceFirst("(?i)^(rs\\.?|lkr)\\s*", "").replace(",", "").replace(" ", "");
    BigDecimal value;
    try {
      value = new BigDecimal(cleaned);
    } catch (NumberFormatException ex) {
      throw new RowProblem("%s \"%s\" is not a number.".formatted(column.label, clip(raw)));
    }
    if (value.signum() < 0) throw new RowProblem("%s cannot be negative.".formatted(column.label));
    if (value.stripTrailingZeros().scale() > 2) {
      throw new RowProblem("%s has more than two decimal places.".formatted(column.label));
    }
    if (value.compareTo(MAX_PRICE) > 0) throw new RowProblem("%s is not plausible.".formatted(column.label));
    return Money.of(value);
  }

  /** A whole number, blank meaning zero. */
  private static int whole(List<String> fields, Map<Column, Integer> columns, Column column, int max) {
    String raw = text(fields, columns, column).replace(",", "");
    if (raw.isEmpty()) return 0;
    try {
      BigDecimal value = new BigDecimal(raw);
      if (value.stripTrailingZeros().scale() > 0) {
        throw new RowProblem("%s must be a whole number.".formatted(column.label));
      }
      if (value.signum() < 0) throw new RowProblem("%s cannot be negative.".formatted(column.label));
      if (value.compareTo(BigDecimal.valueOf(max)) > 0) {
        throw new RowProblem("%s is not plausible.".formatted(column.label));
      }
      return value.intValueExact();
    } catch (NumberFormatException | ArithmeticException ex) {
      throw new RowProblem("%s \"%s\" is not a number.".formatted(column.label, clip(raw)));
    }
  }

  private static String slugOf(String categoryName) {
    try {
      return CategoryService.toSlug(categoryName);
    } catch (ApiException ex) {
      return null;
    }
  }

  private static String normaliseHeading(String heading) {
    return heading.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
  }

  /** Echoes a bad value back without echoing a whole pasted paragraph. */
  private static String clip(String value) {
    return value.length() <= 30 ? value : value.substring(0, 30) + "…";
  }

  private static ApiException invalid(String code, String message) {
    return ApiException.badRequest(code, message);
  }

  private static Map<String, Column> headings() {
    Map<String, Column> map = new HashMap<>();
    for (Column column : Column.values()) {
      for (String heading : column.headings) map.put(heading, column);
    }
    return Map.copyOf(map);
  }

  /** The columns an import understands, and the headings each may go by. */
  enum Column {
    SKU(true, "SKU", "sku", "code", "itemcode", "productcode", "shelfcode"),
    NAME(true, "Name", "name", "productname", "itemname", "product", "item"),
    CATEGORY(true, "Category", "category", "categoryname"),
    BUYING_PRICE(true, "Buying price", "buyingprice", "cost", "costprice", "purchaseprice", "buyprice"),
    SELLING_PRICE(true, "Selling price", "sellingprice", "price", "retailprice", "saleprice", "sellprice", "unitprice"),
    BRAND(false, "Brand", "brand", "make", "manufacturer"),
    UNIT(false, "Unit", "unit", "uom"),
    STOCK(false, "Stock", "stock", "openingstock", "qty", "quantity", "onhand"),
    REORDER_LEVEL(false, "Reorder level", "reorderlevel", "reorder", "minstock", "minimumstock");

    final boolean required;
    final String label;
    final Set<String> headings;

    Column(boolean required, String label, String... headings) {
      this.required = required;
      this.label = label;
      this.headings = Set.of(headings);
    }
  }

  /** A row that can be imported. */
  public record ImportRow(
      int line,
      String sku,
      String name,
      String brand,
      String category,
      String unit,
      BigDecimal buyingPrice,
      BigDecimal sellingPrice,
      int stock,
      int reorderLevel) {}

  /** A row that cannot, and why. */
  public record RowError(int line, String message) {}

  /** What an import would do. Nothing has been written when one of these exists. */
  public record ImportPlan(
      List<ImportRow> rows,
      Set<String> existingSkus,
      /** Existing products the file would not change; skipped when writing. */
      Set<String> unchangedSkus,
      /** slug → name as written in the file, for categories that do not exist yet. */
      Map<String, String> newCategories,
      List<RowError> errors,
      int errorCount) {

    public long toCreate() {
      return rows.stream().filter(row -> !existingSkus.contains(row.sku())).count();
    }

    public long toUpdate() {
      return rows.size() - toCreate() - unchanged();
    }

    public long unchanged() {
      return unchangedSkus.size();
    }
  }

  /** What an import did. */
  public record ImportOutcome(
      long created, long updated, List<String> categoriesCreated, List<RowError> conflicts) {}

  /** One row is wrong; the rest of the file carries on. */
  private static final class RowProblem extends RuntimeException {
    RowProblem(String message) {
      super(message, null, false, false);
    }
  }
}
