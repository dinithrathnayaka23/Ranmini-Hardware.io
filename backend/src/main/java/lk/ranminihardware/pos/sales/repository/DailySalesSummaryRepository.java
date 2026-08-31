package lk.ranminihardware.pos.sales.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.sales.domain.DailySalesSummary;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.domain.Sort;

/**
 * Pre-aggregated daily totals.
 *
 * Reads here are what the reports screen is built on, so they are all small
 * indexed range scans rather than aggregations over the sales collection.
 */
public interface DailySalesSummaryRepository extends MongoRepository<DailySalesSummary, String> {

  /**
   * Daily totals within an inclusive range.
   *
   * <p>Explicit rather than a derived {@code Between} for the same reason as
   * the sales query: Spring Data makes that keyword exclusive at both ends, so
   * a "this month" chart would silently omit the first and last day.
   */
  @Query(value = "{ 'date': { $gte: ?0, $lte: ?1 } }", sort = "{ 'date': 1 }")
  List<DailySalesSummary> findInDateRange(LocalDate from, LocalDate to);

  Optional<DailySalesSummary> findByDate(LocalDate date);
}
