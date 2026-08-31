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
   * Daily totals within an inclusive range, by ISO date string.
   *
   * <p>Two deliberate choices. It matches on {@code _id}, which is the trading
   * day, so the query runs on the primary key index. And it compares strings
   * rather than dates, because an ISO date has exactly one meaning while a BSON
   * date is an instant whose interpretation depends on a timezone the writer
   * and reader have to agree on — they did not, and the reports screen came back
   * empty as a result.
   *
   * <p>Explicit rather than a derived {@code Between}, which Spring Data makes
   * exclusive at both ends and would drop the first and last day of the range.
   */
  @Query(value = "{ '_id': { $gte: ?0, $lte: ?1 } }", sort = "{ '_id': 1 }")
  List<DailySalesSummary> findInDateRange(String fromIsoDate, String toIsoDate);

  Optional<DailySalesSummary> findByDate(String isoDate);
}
