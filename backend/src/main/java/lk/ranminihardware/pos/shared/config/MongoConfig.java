package lk.ranminihardware.pos.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions.BigDecimalRepresentation;

/**
 * MongoDB mapping configuration.
 *
 * <p>The one setting here that genuinely matters is the representation of
 * {@code BigDecimal}. Spring Data's default is to store it as a <em>string</em>,
 * which works for round-tripping but quietly breaks everything else: a string
 * cannot be summed by an aggregation pipeline, and it sorts lexicographically,
 * so "9.00" comes after "10.00". Every report in this service sums money in the
 * database rather than in the application, so amounts are stored as native
 * {@code Decimal128} — exact, summable, and correctly ordered.
 *
 * <p>Changing this on a populated database is a migration, not a config tweak:
 * existing string amounts would no longer match numeric queries.
 */
@Configuration
public class MongoConfig {

  @Bean
  public MongoCustomConversions mongoCustomConversions() {
    return MongoCustomConversions.create(
        adapter -> adapter.bigDecimal(BigDecimalRepresentation.DECIMAL128));
  }
}
