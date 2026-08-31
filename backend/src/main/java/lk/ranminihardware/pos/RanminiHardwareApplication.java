package lk.ranminihardware.pos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/**
 * Entry point for the Ranmini Hardware point-of-sale service.
 *
 * The application is a modular monolith: one deployable, but organised by
 * feature (catalog, sales, reporting, staff, settings) rather than by technical
 * layer. Each feature package owns its documents, repositories and endpoints,
 * and reaches other features only through their published `api` packages.
 */
@SpringBootApplication
@EnableCaching
@EnableMongoAuditing
public class RanminiHardwareApplication {

  public static void main(String[] args) {
    SpringApplication.run(RanminiHardwareApplication.class, args);
  }
}
