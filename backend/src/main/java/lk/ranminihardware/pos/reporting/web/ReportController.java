package lk.ranminihardware.pos.reporting.web;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import lk.ranminihardware.pos.reporting.service.ReportingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sales analytics for the reports screen.
 *
 * <p>Every endpoint takes an explicit date range and defaults to the current
 * month. There is no "all time" option on purpose: it is the one query whose
 * cost grows without bound, and no screen in the design asks for it.
 */
@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

  private final ReportingService reporting;
  private final Clock clock;

  public ReportController(ReportingService reporting, Clock clock) {
    this.reporting = reporting;
    this.clock = clock;
  }

  /**
   * Everything the reports screen needs, in one request.
   *
   * <p>Bundled rather than split into four endpoints because the screen renders
   * them together and four round trips from a shop's connection is three too
   * many. The pieces are still separately available below for anything that
   * needs just one.
   */
  @GetMapping
  public ResponseEntity<ReportBundle> overview(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

    LocalDate end = to == null ? LocalDate.now(clock) : to;
    LocalDate start = from == null ? end.withDayOfMonth(1) : from;

    ReportBundle bundle =
        new ReportBundle(
            start,
            end,
            reporting.totals(start, end),
            reporting.dailySeries(start, end).stream().map(ReportDtos.DailyPoint::from).toList(),
            reporting.categoryShares(start, end, 6),
            reporting.topProducts(start, end, 5));

    return ResponseEntity.ok()
        // Yesterday's figures never change and today's move slowly. A minute of
        // caching stops a dashboard left open on the counter from re-running
        // the aggregations every few seconds.
        .header("Cache-Control", "private, max-age=60")
        .body(bundle);
  }

  @GetMapping("/daily")
  public List<ReportDtos.DailyPoint> daily(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    return reporting.dailySeries(from, to).stream().map(ReportDtos.DailyPoint::from).toList();
  }

  @GetMapping("/categories")
  public List<ReportDtos.CategoryShare> categories(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(defaultValue = "6") int limit) {
    return reporting.categoryShares(from, to, limit);
  }

  @GetMapping("/top-products")
  public List<ReportDtos.TopProduct> topProducts(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(defaultValue = "5") int limit) {
    return reporting.topProducts(from, to, limit);
  }

  /** The whole reports screen in one payload. */
  public record ReportBundle(
      LocalDate from,
      LocalDate to,
      ReportDtos.PeriodTotals totals,
      List<ReportDtos.DailyPoint> daily,
      List<ReportDtos.CategoryShare> categories,
      List<ReportDtos.TopProduct> topProducts) {}
}
