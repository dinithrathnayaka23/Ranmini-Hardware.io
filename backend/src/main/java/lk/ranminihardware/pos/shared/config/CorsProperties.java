package lk.ranminihardware.pos.shared.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Browser origins permitted to call this API, bound from `ranmini.cors.*`.
 *
 * Supplied by the environment rather than hard-coded: the development origin
 * (localhost:3000) must never be trusted by a production deployment.
 */
@ConfigurationProperties(prefix = "ranmini.cors")
public record CorsProperties(List<String> allowedOrigins) {

  public CorsProperties {
    allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
  }
}
