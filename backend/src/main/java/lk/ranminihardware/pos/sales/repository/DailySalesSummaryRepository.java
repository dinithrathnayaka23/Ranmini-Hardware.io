package lk.ranminihardware.pos.sales.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.sales.domain.DailySalesSummary;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Pre-aggregated daily totals.
 *
 * Reads here are what the reports screen is built on, so they are all small
 * indexed range scans rather than aggregations over the sales collection.
 */
public interface DailySalesSummaryRepository extends MongoRepository<DailySalesSummary, String> {

  List<DailySalesSummary> findByDateBetweenOrderByDateAsc(LocalDate from, LocalDate to);

  Optional<DailySalesSummary> findByDate(LocalDate date);
}
