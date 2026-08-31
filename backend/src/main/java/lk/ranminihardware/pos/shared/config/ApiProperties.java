package lk.ranminihardware.pos.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tunables for the HTTP layer, bound from `ranmini.api.*`.
 *
 * @param maxPageSize hard ceiling on the page size any client may request. This
 *     is a availability control, not a preference: without it a single
 *     `?size=1000000` turns every paged endpoint into a full collection scan.
 * @param defaultPageSize page size used when the client does not ask for one.
 */
@ConfigurationProperties(prefix = "ranmini.api")
public record ApiProperties(int maxPageSize, int defaultPageSize) {

  public ApiProperties {
    if (maxPageSize <= 0) maxPageSize = 200;
    if (defaultPageSize <= 0) defaultPageSize = 25;
  }
}
