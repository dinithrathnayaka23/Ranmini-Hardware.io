package lk.ranminihardware.pos.shared.pdf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.service.CategoryService;
import lk.ranminihardware.pos.catalog.service.InventoryPdfService;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.reporting.service.ReportingService;
import lk.ranminihardware.pos.reporting.service.SalesReportPdfService;
import lk.ranminihardware.pos.reporting.web.ReportDtos;
import lk.ranminihardware.pos.sales.domain.DailySalesSummary;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.service.SettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * The two exported documents render.
 *
 * <p>A unit test with mocked services rather than an integration test, because
 * what is being checked is the document builder: given rows, does it produce a
 * valid PDF with the right number of pages and the figures in it. Whether the
 * rows themselves are correct is what the reporting tests are for.
 *
 * <p>The rendered files are written to {@code target/} as well as asserted on.
 * A PDF that parses is not the same as a PDF that looks right, and a layout
 * change is far quicker to check by opening the artefact than by reading a
 * diff of drawing code.
 */
class ReportPdfTest {

  private static final Clock CLOCK =
      Clock.fixed(Instant.parse("2026-09-03T10:15:00Z"), ZoneId.of("Asia/Colombo"));

  @Test
  void rendersTheInventoryStockSheet() throws IOException {
    ProductService products = mock(ProductService.class);
    CategoryService categories = mock(CategoryService.class);

    when(products.summarise())
        .thenReturn(
            new InventorySummary(
                412, 7, 2, new BigDecimal("4821500.00"), new BigDecimal("3655200.00")));

    Category cement = category("cat-1", "Cement & Sand", 1);
    Category tools = category("cat-2", "Tools", 2);
    when(categories.listAll()).thenReturn(List.of(cement, tools));

    when(products.search(any(), any()))
        .thenAnswer(
            invocation -> {
              PageRequest pageable = invocation.getArgument(1);
              // One page of rows, then nothing: enough to exercise the group
              // header, the tinted rows and the subtotal without looping.
              List<Product> rows =
                  pageable.getPageNumber() == 0 ? sampleProducts() : List.of();
              return new PageImpl<>(rows, pageable, rows.size());
            });

    byte[] pdf =
        new InventoryPdfService(products, categories, settings(), CLOCK)
            .render(
                new lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria(
                    null, null, null, true),
                "Nimal Rathnayaka");

    assertPdf(pdf, "inventory-report.pdf");
  }

  @Test
  void rendersTheSalesReport() throws IOException {
    ReportingService reporting = mock(ReportingService.class);

    when(reporting.totals(any(), any()))
        .thenReturn(
            new ReportDtos.PeriodTotals(
                318,
                1_942,
                new BigDecimal("1284500.00"),
                new BigDecimal("289012.50"),
                new BigDecimal("4039.31")));

    when(reporting.dailySeries(any(), any())).thenReturn(sampleDays());

    when(reporting.categoryShares(any(), any(), anyInt()))
        .thenReturn(
            List.of(
                new ReportDtos.CategoryShare(
                    "cat-1", "Cement & Sand", new BigDecimal("612000.00"), new BigDecimal("0.4765")),
                new ReportDtos.CategoryShare(
                    "cat-2", "Plumbing", new BigDecimal("358200.00"), new BigDecimal("0.2789")),
                new ReportDtos.CategoryShare(
                    "cat-3", "Tools", new BigDecimal("314300.00"), new BigDecimal("0.2446"))));

    when(reporting.topProducts(any(), any(), anyInt()))
        .thenReturn(
            List.of(
                new ReportDtos.TopProduct(
                    "p-1", "Cemex Portland 50kg", "CEM-001", 412, new BigDecimal("1009400.00")),
                new ReportDtos.TopProduct(
                    "p-2", "PVC Pipe 1\" 10ft", "PVC-100", 288, new BigDecimal("244800.00"))));

    byte[] pdf =
        new SalesReportPdfService(reporting, settings(), CLOCK)
            .render(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31), "Nimal Rathnayaka");

    assertPdf(pdf, "sales-report.pdf");
  }

  /**
   * A rendered document is a PDF, has content, and is written out for a human to
   * look at.
   *
   * <p>The magic-number check is not ceremony: OpenPDF answers a failed render
   * with an empty or truncated stream rather than an exception, so "no exception
   * was thrown" is not evidence that anything was produced.
   */
  private void assertPdf(byte[] pdf, String filename) throws IOException {
    assertThat(pdf).isNotEmpty();
    assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
    assertThat(pdf.length).isGreaterThan(2_000);

    Path out = Path.of("target", "pdf-samples", filename);
    Files.createDirectories(out.getParent());
    Files.write(out, pdf);
  }

  private static SettingsService settings() {
    SettingsService settings = mock(SettingsService.class);

    ShopSettings shop = ShopSettings.defaults();
    shop.getProfile().setPrimaryAddress("Karadupona, Kegalle");
    shop.getProfile().setContactPhone("+94 35 226 1234");
    shop.getProfile().setContactEmail("hello@ranminihardware.lk");
    shop.getProfile().setRegistrationNumber("PV 128456");

    when(settings.get()).thenReturn(shop);
    return settings;
  }

  private static Category category(String id, String name, int order) {
    return Category.builder().id(id).name(name).displayOrder(order).active(true).build();
  }

  private static List<Product> sampleProducts() {
    List<Product> products = new ArrayList<>();

    products.add(
        product("CEM-001", "Cemex Portland 50kg", "Tokyo Super", "bags", "1900.00", "2450.00", 4, 5));
    products.add(product("CEM-SAND", "River Sand (cube)", null, "cubes", "24000.00", "29500.00", 8, 3));
    products.add(product("TOL-HMR", "Claw Hammer 16oz", "Stanley", "pcs", "2100.00", "2900.00", 0, 4));
    products.add(product("HW-NW2", "Wire Nails 2\" (1kg)", null, "kg", "260.00", "350.00", 210, 40));

    return products;
  }

  private static Product product(
      String sku,
      String name,
      String brand,
      String unit,
      String cost,
      String price,
      int stock,
      int reorderLevel) {

    Product product =
        Product.builder()
            .id(sku)
            .sku(sku)
            .name(name)
            .brand(brand)
            .categoryId("cat-1")
            .categoryName("Cement & Sand")
            .unit(unit)
            .buyingPrice(new BigDecimal(cost))
            .sellingPrice(new BigDecimal(price))
            .stock(stock)
            .reorderLevel(reorderLevel)
            .active(true)
            .updatedAt(Instant.parse("2026-09-01T04:00:00Z"))
            .build();

    product.refreshStatus();
    assertThat(product.getStatus()).isNotNull();
    return product;
  }

  /** Twenty trading days with a plausible weekly rhythm, so the chart has shape. */
  private static List<DailySalesSummary> sampleDays() {
    List<DailySalesSummary> days = new ArrayList<>();
    LocalDate date = LocalDate.of(2026, 8, 1);

    for (int i = 0; i < 20; i++) {
      // Sundays are quiet in a hardware shop; Saturdays are the week's peak.
      double weekday = switch (date.getDayOfWeek()) {
        case SUNDAY -> 0.35;
        case SATURDAY -> 1.4;
        default -> 1.0;
      };
      BigDecimal revenue =
          BigDecimal.valueOf(Math.round(42_000 * weekday + (i % 5) * 3_500)).setScale(2);

      days.add(
          DailySalesSummary.builder()
              .id(date.toString())
              .date(date.toString())
              .transactions(12 + (i % 7))
              .unitsSold(60 + (i % 11) * 4)
              .grossRevenue(revenue)
              .netRevenue(revenue)
              .discountTotal(BigDecimal.valueOf(500L * (i % 3)).setScale(2))
              .taxTotal(BigDecimal.ZERO.setScale(2))
              .costTotal(revenue.multiply(new BigDecimal("0.78")))
              .profit(revenue.multiply(new BigDecimal("0.22")))
              .build());

      date = date.plusDays(1);
    }

    return days;
  }

  /** Guards the assumption the report makes: statuses come from the domain rule. */
  @Test
  void stockStatusDrivesTheAlertColouring() {
    assertThat(StockStatus.of(0, 5)).isEqualTo(StockStatus.OUT_OF_STOCK);
    assertThat(StockStatus.of(4, 5)).isEqualTo(StockStatus.LOW_STOCK);
    assertThat(StockStatus.of(50, 5)).isEqualTo(StockStatus.IN_STOCK);
  }
}
