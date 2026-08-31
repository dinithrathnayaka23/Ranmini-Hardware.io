package lk.ranminihardware.pos.shared.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The clock the service reads the time from.
 *
 * <p>Injected rather than called statically so a test can fix "now" and assert
 * that a sale landed on the right trading day. Code that calls
 * {@code Instant.now()} directly cannot be tested for anything date-dependent
 * without waiting for midnight.
 *
 * <p>The zone matters as much as the instant. A sale is filed under the shop's
 * local trading day, so a receipt written at 23:50 in Colombo belongs to that
 * day and not to whatever date it happens to be in UTC — which is exactly the
 * kind of off-by-one that makes a day's takings disagree with the till roll.
 */
@Configuration
public class ClockConfig {

  @Bean
  public Clock shopClock(@Value("${ranmini.time.zone:Asia/Colombo}") String zone) {
    return Clock.system(ZoneId.of(zone));
  }
}
