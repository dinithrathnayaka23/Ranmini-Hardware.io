package lk.ranminihardware.pos.dashboard.web;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.reporting.service.ReportingService;
import lk.ranminihardware.pos.reporting.web.ReportDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The admin dashboard.
 *
 * <p>Composes figures the other modules already produce rather than computing
 * anything of its own — a dashboard is a view, and giving it its own queries is
 * how two screens end up quoting different numbers for the same thing.
 *
 * <p>Served as a single bundled response. The screen shows four stat cards, a
 * low-stock list and a recent-sales list together; four separate round trips
 * from a shop's connection would be three too many.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

  /** Enough to fill the panel without scrolling; the rest is a click away. */
  private static final int LOW_STOCK_LIMIT = 8;

  private final ProductService products;
  private final ReportingService reporting;
  private final Clock clock;

  public DashboardController(
      ProductService products, ReportingService reporting, Clock clock) {
    this.products = products;
    this.reporting = reporting;
    this.clock = clock;
  }

  @GetMapping
  public ResponseEntity<Response> overview() {
    LocalDate today = LocalDate.now(clock);
    LocalDate monthStart = today.withDayOfMonth(1);

    InventorySummary inventory = products.summarise();
    ReportDtos.PeriodTotals todayTotals = reporting.totals(today, today);
    ReportDtos.PeriodTotals monthTotals = reporting.totals(monthStart, today);

    List<LowStockItem> lowStock =
        products.lowStock(LOW_STOCK_LIMIT).stream().map(LowStockItem::from).toList();

    Response body =
        new Response(
            todayTotals.revenue(),
            todayTotals.transactions(),
            monthTotals.revenue(),
            monthTotals.profit(),
            inventory.totalProducts(),
            inventory.lowStockItems(),
            inventory.outOfStockItems(),
            inventory.retailValue(),
            lowStock);

    return ResponseEntity.ok()
        // A dashboard left open on the counter would otherwise re-run these
        // aggregations every few seconds for figures that move slowly.
        .header("Cache-Control", "private, max-age=30")
        .body(body);
  }

  public record Response(
      BigDecimal todayRevenue,
      long todayTransactions,
      BigDecimal monthRevenue,
      BigDecimal monthProfit,
      long totalProducts,
      long lowStockItems,
      long outOfStockItems,
      BigDecimal inventoryValue,
      List<LowStockItem> lowStock) {}

  /** A row in the low-stock panel. Field names match the frontend's type. */
  public record LowStockItem(
      String id, String name, String sku, int currentStock, int reorderLevel, String unit) {

    static LowStockItem from(Product p) {
      return new LowStockItem(
          p.getId(), p.getName(), p.getSku(), p.getStock(), p.getReorderLevel(), p.getUnit());
    }
  }
}
