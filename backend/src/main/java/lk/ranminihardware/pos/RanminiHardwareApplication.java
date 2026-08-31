package lk.ranminihardware.pos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
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
/*
 * Spring Boot's default in-memory user is excluded. Authentication here is a
 * signed token checked against staff records, so that account can never sign
 * in — but leaving it enabled prints a line at every startup that reads exactly
 * like a real credential ("Using generated security password: ..."), and a
 * plausible-looking password in a log is the kind of thing somebody eventually
 * tries in production.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableCaching
@EnableMongoAuditing
public class RanminiHardwareApplication {

  public static void main(String[] args) {
    SpringApplication.run(RanminiHardwareApplication.class, args);
  }
}
