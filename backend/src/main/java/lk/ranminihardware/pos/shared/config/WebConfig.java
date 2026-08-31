package lk.ranminihardware.pos.shared.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds the typed configuration properties the service reads.
 *
 * CORS used to live here. It moved to SecurityConfig once Spring Security was
 * introduced: with both in play the security filter chain runs first, so a
 * CORS policy declared at the MVC layer never gets a say on a rejected request
 * and the preflight fails for reasons nobody can see. One owner, one policy.
 */
@Configuration
@EnableConfigurationProperties({ApiProperties.class, CorsProperties.class})
public class WebConfig {}
