package lk.ranminihardware.pos.catalog.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.pdf.PdfReport;
import lk.ranminihardware.pos.shared.pdf.PdfTheme;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * The printable stock sheet.
 *
 * <p>This replaced a client-side CSV export, and the reason is not that PDF is
 * prettier. The CSV was written in the browser from the rows the table had
 * loaded — one page of ten — so a shop with four hundred products got a file
 * with ten in it and no indication that anything was missing. Building it here
 * means the export covers the whole catalogue the filters describe, carries the
 * shop's own letterhead from settings, and totals its own columns so the figure
 * at the bottom cannot disagree with the lines above it.
 *
 * <p><b>Grouped by category with a subtotal each.</b> The document is used for
 * stocktaking, which is done aisle by aisle, and the value of the stock in one
 * aisle is a figure the owner otherwise has to add up by hand.
 *
 * <p>Categories are walked one at a time rather than the whole catalogue being
 * sorted by category name. Sorting on the denormalised name is not backed by an
 * index and would drag the entire collection through an in-memory sort; a query
 * per category uses {@code ix_product_category_name} and returns rows already in
 * the right order. There are tens of categories and potentially hundreds of
 * thousands of products, so the extra round trips are the cheap half of the
 * trade.
 */
@Service
public class InventoryPdfService {

  /**
   * How many products are read per round trip while building the document.
   *
   * <p>Large enough that a typical category is one query, small enough that no
   * single response holds a meaningful part of the catalogue in memory.
   */
  private static final int BATCH = 250;

  /**
   * Hard ceiling on the lines in one export.
   *
   * <p>A PDF of fifty thousand products is not a document anybody reads — it is
   * a way to spend a minute of server time and a hundred megabytes of memory by
   * clicking a button. Past this the report says plainly that it was truncated
   * and asks the reader to narrow the filters, which is the honest outcome
   * rather than a file that silently stops.
   */
  private static final int MAX_ROWS = 5_000;

  private static final DateTimeFormatter STAMP =
      DateTimeFormatter.ofPattern("d MMM yyyy 'at' HH:mm");

  private final ProductService products;
  private final CategoryService categories;
  private final SettingsService settings;
  private final Clock clock;

  public InventoryPdfService(
      ProductService products,
      CategoryService categories,
      SettingsService settings,
      Clock clock) {
    this.products = products;
    this.categories = categories;
    this.settings = settings;
    this.clock = clock;
  }

  /**
   * Renders the stock sheet.
   *
   * @param criteria the same filters the inventory table uses, so what is
   *     exported is what the person was looking at — not a different report that
   *     happens to be called the same thing
   * @param requestedBy the signed-in administrator, printed in the letterhead
   */
  public byte[] render(ProductSearchCriteria criteria, String requestedBy) {
    ShopSettings shop = settings.get();
    String currency = currencySymbol(shop);
    InventorySummary summary = products.summarise();

    PdfReport.Letterhead letterhead =
        new PdfReport.Letterhead(
            shop.getProfile().getCompanyName(),
            shopDetails(shop),
            "Inventory Report",
            describe(criteria),
            requestedBy,
            LocalDateTime.now(clock).format(STAMP));

    // Landscape, because twelve columns of detail on portrait A4 either wrap the
    // product names or shrink the type below what reads on paper.
    Rectangle page = PageSize.A4.rotate();

    return PdfReport.render(
        page,
        letterhead,
        (document, writer) -> {
          writeSummary(document, summary, currency);
          writeCatalogue(document, criteria, currency);
        });
  }

  /**
   * The five figures the inventory screen shows on its cards.
   *
   * <p>Taken from the same aggregation the screen uses, so the printout and the
   * screen agree. Note that these describe the <em>whole active catalogue</em>
   * rather than the filtered selection below them, which the caption says
   * outright — a summary that silently changed meaning with the filters would be
   * worse than no summary.
   */
  private void writeSummary(Document document, InventorySummary summary, String currency) {
    document.add(PdfReport.section("Catalogue at a glance"));
    document.add(
        PdfReport.note(
            "Across the whole active catalogue, whatever the filters below."));

    PdfPTable cards = new PdfPTable(5);
    cards.setWidthPercentage(100F);
    cards.setSpacingBefore(8F);

    cards.addCell(summaryCard("Products", count(summary.totalProducts()), false));
    cards.addCell(summaryCard("Low stock", count(summary.lowStockItems()), summary.lowStockItems() > 0));
    cards.addCell(
        summaryCard("Out of stock", count(summary.outOfStockItems()), summary.outOfStockItems() > 0));
    cards.addCell(summaryCard("Stock at cost", money(summary.costValue(), currency), false));
    cards.addCell(summaryCard("Stock at retail", money(summary.retailValue(), currency), false));

    document.add(cards);
  }

  private PdfPCell summaryCard(String label, String value, boolean alert) {
    PdfPCell cell = new PdfPCell();
    cell.setBorderColor(PdfTheme.LINE);
    cell.setBorderWidth(0.6F);
    cell.setBackgroundColor(PdfTheme.ROW_FILL);
    cell.setPadding(8F);

    Paragraph caption = new Paragraph(label, PdfTheme.SMALL);
    Paragraph figure =
        new Paragraph(
            value,
            PdfTheme.font(13F, Font.BOLD, alert ? PdfTheme.ALERT : PdfTheme.INK));
    figure.setSpacingBefore(2F);

    cell.addElement(caption);
    cell.addElement(figure);
    return cell;
  }

  /** The line-by-line catalogue, one category at a time. */
  private void writeCatalogue(Document document, ProductSearchCriteria criteria, String currency) {
    document.add(PdfReport.section("Stock detail"));

    PdfPTable table =
        PdfTheme.table(2.0F, 4.2F, 2.2F, 1.0F, 1.8F, 1.8F, 1.3F, 1.1F, 1.3F, 1.7F, 2.0F, 2.0F);

    table.addCell(PdfTheme.head("SKU", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Product", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Brand", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Unit", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Buying", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Selling", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Margin", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Stock", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Reorder", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Status", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Cost value", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Retail value", Element.ALIGN_RIGHT));

    Totals grand = new Totals();
    int rows = 0;
    boolean truncated = false;

    for (Category category : categoriesToWalk(criteria)) {
      int room = MAX_ROWS - rows;
      if (room <= 0) {
        truncated = true;
        break;
      }

      // One more than there is room for, so a category that overflows the cap
      // is detectable rather than being silently cut at exactly the limit.
      List<Product> lines = read(criteria, category.getId(), room + 1);
      if (lines.isEmpty()) continue;

      if (lines.size() > room) {
        lines = lines.subList(0, room);
        truncated = true;
      }

      // One cell spanning the whole width, so the category reads as a band
      // across the page. Confined to the first column it wrapped instead —
      // "Cement &" over "Sand" inside the SKU heading.
      PdfPCell band = PdfTheme.groupCell(category.getName(), Element.ALIGN_LEFT);
      band.setColspan(12);
      table.addCell(band);

      Totals group = new Totals();
      boolean tinted = false;

      for (Product product : lines) {
        writeRow(table, product, currency, tinted);
        tinted = !tinted;
        group.add(product);
        rows++;
      }

      writeSubtotal(table, group, currency);
      grand.add(group);

      if (truncated) break;
    }


    if (rows == 0) {
      PdfPCell empty =
          PdfTheme.cell("No products match these filters.", Element.ALIGN_CENTER, false);
      empty.setColspan(12);
      empty.setPaddingTop(14F);
      empty.setPaddingBottom(14F);
      table.addCell(empty);
      document.add(table);
      return;
    }

    writeGrandTotal(table, grand, currency);
    document.add(table);

    if (truncated) {
      document.add(
          PdfReport.note(
              ("Truncated at %s lines. Narrow the export with a search term, a category or a"
                      + " stock filter to see the rest.")
                  .formatted(count(MAX_ROWS))));
    }
  }

  /**
   * Which categories the document walks.
   *
   * <p>A single-category filter short-circuits to that one; otherwise every
   * category in the shop's own display order, deactivated ones included — a
   * category that was retired can still hold products, and stock nobody can see
   * is exactly the stock a stocktake needs to find.
   */
  private List<Category> categoriesToWalk(ProductSearchCriteria criteria) {
    if (criteria.categoryId() != null && !criteria.categoryId().isBlank()) {
      return List.of(categories.get(criteria.categoryId()));
    }
    return categories.listAll();
  }

  /** Reads one category's products in batches, in shelf-label order. */
  private List<Product> read(ProductSearchCriteria criteria, String categoryId, int remaining) {
    if (remaining <= 0) return List.of();

    ProductSearchCriteria scoped =
        new ProductSearchCriteria(
            criteria.term(), categoryId, criteria.status(), criteria.activeOnly());

    List<Product> all = new ArrayList<>();
    int page = 0;

    while (all.size() < remaining) {
      var slice =
          products.search(
              scoped, PageRequest.of(page, BATCH, Sort.by(Sort.Direction.ASC, "name")));

      all.addAll(slice.getContent());
      if (!slice.hasNext()) break;
      page++;
    }

    return all.size() > remaining ? all.subList(0, remaining) : all;
  }

  private void writeRow(PdfPTable table, Product product, String currency, boolean tinted) {
    BigDecimal cost = multiply(product.getBuyingPrice(), product.getStock());
    BigDecimal retail = multiply(product.getSellingPrice(), product.getStock());

    table.addCell(PdfTheme.cell(product.getSku(), Element.ALIGN_LEFT, tinted));
    table.addCell(PdfTheme.cell(product.getName(), Element.ALIGN_LEFT, tinted));
    table.addCell(PdfTheme.cell(blankToDash(product.getBrand()), Element.ALIGN_LEFT, tinted));
    table.addCell(PdfTheme.cell(blankToDash(product.getUnit()), Element.ALIGN_LEFT, tinted));
    table.addCell(PdfTheme.cell(money(product.getBuyingPrice(), currency), Element.ALIGN_RIGHT, tinted));
    table.addCell(
        PdfTheme.cell(money(product.getSellingPrice(), currency), Element.ALIGN_RIGHT, tinted));
    table.addCell(PdfTheme.cell(margin(product), Element.ALIGN_RIGHT, tinted));

    // The stock figure is the one number somebody scans this page for, so an
    // empty shelf is coloured rather than left to be spotted in the status
    // column at the other end of the row.
    boolean empty = product.getStock() <= 0;
    table.addCell(
        PdfTheme.cell(
            new Phrase(count(product.getStock()), empty ? PdfTheme.CELL_ALERT : PdfTheme.CELL),
            Element.ALIGN_RIGHT,
            tinted));

    table.addCell(PdfTheme.cell(count(product.getReorderLevel()), Element.ALIGN_RIGHT, tinted));
    table.addCell(PdfTheme.cell(statusLabel(product.getStatus()), Element.ALIGN_LEFT, tinted));
    table.addCell(PdfTheme.cell(money(cost, currency), Element.ALIGN_RIGHT, tinted));
    table.addCell(PdfTheme.cell(money(retail, currency), Element.ALIGN_RIGHT, tinted));
  }

  private void writeSubtotal(PdfPTable table, Totals totals, String currency) {
    PdfPCell label =
        PdfTheme.groupCell(
            "Subtotal · %s lines · %s units".formatted(count(totals.lines), count(totals.units)),
            Element.ALIGN_LEFT);
    label.setColspan(10);
    table.addCell(label);
    table.addCell(PdfTheme.groupCell(money(totals.cost, currency), Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.groupCell(money(totals.retail, currency), Element.ALIGN_RIGHT));
  }

  private void writeGrandTotal(PdfPTable table, Totals totals, String currency) {
    PdfPCell label =
        PdfTheme.groupCell(
            "Total exported · %s lines · %s units".formatted(count(totals.lines), count(totals.units)),
            Element.ALIGN_LEFT);
    label.setColspan(10);
    label.setBorderWidthTop(1.2F);
    table.addCell(label);

    PdfPCell cost = PdfTheme.groupCell(money(totals.cost, currency), Element.ALIGN_RIGHT);
    cost.setBorderWidthTop(1.2F);
    table.addCell(cost);

    PdfPCell retail = PdfTheme.groupCell(money(totals.retail, currency), Element.ALIGN_RIGHT);
    retail.setBorderWidthTop(1.2F);
    table.addCell(retail);
  }

  /** Running units and value, for a category and for the document. */
  private static final class Totals {
    private long lines;
    private long units;
    private BigDecimal cost = BigDecimal.ZERO;
    private BigDecimal retail = BigDecimal.ZERO;

    void add(Product product) {
      lines++;
      units += product.getStock();
      cost = cost.add(multiply(product.getBuyingPrice(), product.getStock()));
      retail = retail.add(multiply(product.getSellingPrice(), product.getStock()));
    }

    void add(Totals other) {
      lines += other.lines;
      units += other.units;
      cost = cost.add(other.cost);
      retail = retail.add(other.retail);
    }
  }

  /** Says in words what the filters were, so a printout can be trusted later. */
  private static String describe(ProductSearchCriteria criteria) {
    List<String> parts = new ArrayList<>();

    if (criteria.hasTerm()) parts.add("matching \"%s\"".formatted(criteria.term().trim()));
    if (criteria.status() != null) parts.add(statusLabel(criteria.status()).toLowerCase());
    parts.add(criteria.activeOnly() ? "active products only" : "including deactivated products");

    return "Grouped by category · " + String.join(" · ", parts);
  }

  private static String shopDetails(ShopSettings shop) {
    ShopSettings.ShopProfile profile = shop.getProfile();
    List<String> parts = new ArrayList<>();

    if (notBlank(profile.getPrimaryAddress())) {
      // Addresses are stored multi-line; a letterhead line needs one line.
      parts.add(profile.getPrimaryAddress().replaceAll("\\s*\\R\\s*", ", "));
    }
    if (notBlank(profile.getContactPhone())) parts.add(profile.getContactPhone());
    if (notBlank(profile.getContactEmail())) parts.add(profile.getContactEmail());
    if (notBlank(profile.getRegistrationNumber())) {
      parts.add("Reg. " + profile.getRegistrationNumber());
    }

    return String.join(" · ", parts);
  }

  private String currencySymbol(ShopSettings shop) {
    String symbol = shop.getBusinessLogic().getCurrencySymbol();
    return symbol == null || symbol.isBlank() ? "Rs." : symbol;
  }

  private static String statusLabel(StockStatus status) {
    if (status == null) return "—";
    return switch (status) {
      case IN_STOCK -> "In stock";
      case LOW_STOCK -> "Low stock";
      case OUT_OF_STOCK -> "Out of stock";
    };
  }

  /**
   * Margin as a percentage of the selling price.
   *
   * <p>Of the selling price rather than of cost, because that is the figure a
   * shopkeeper compares between lines — and it is the one the add-product screen
   * shows while the prices are being typed, so the two agree.
   */
  private static String margin(Product product) {
    BigDecimal selling = product.getSellingPrice();
    BigDecimal buying = product.getBuyingPrice();

    if (selling == null || buying == null || selling.signum() <= 0) return "—";

    BigDecimal share =
        selling.subtract(buying).multiply(BigDecimal.valueOf(100)).divide(selling, 1, RoundingMode.HALF_UP);
    return share + "%";
  }

  private static BigDecimal multiply(BigDecimal price, int quantity) {
    if (price == null) return BigDecimal.ZERO;
    return price.multiply(BigDecimal.valueOf(quantity));
  }

  /** Money with thousands separators, which is how a shop reads a total. */
  private static String money(BigDecimal amount, String currency) {
    BigDecimal value = amount == null ? BigDecimal.ZERO : amount.setScale(2, RoundingMode.HALF_UP);
    return "%s %,.2f".formatted(currency, value);
  }

  private static String count(long value) {
    return "%,d".formatted(value);
  }

  private static String blankToDash(String value) {
    return notBlank(value) ? value : "—";
  }

  private static boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }
}
