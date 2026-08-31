package lk.ranminihardware.pos.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Browsable API documentation at {@code /swagger-ui.html}.
 *
 * <p>Worth the dependency because the next phase of this project is wiring a
 * frontend that already exists to endpoints that did not. A living, executable
 * description of the contract is faster to work against than a document that
 * starts going stale the day it is written.
 *
 * <p>The UI is currently reachable by anyone who can reach the service. That is
 * acceptable while the API is only bound to a shop's local network and has no
 * data worth reading, but it must be put behind authentication in the same
 * change that adds it — an unauthenticated endpoint index is a gift to anyone
 * probing the service.
 */
@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI ranminiOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Ranmini Hardware POS API")
                .version("v1")
                .description(
                    """
                    Point-of-sale and inventory service for Ranmini Hardware.

                    Two rules govern the money endpoints. The server prices every
                    basket — a checkout request carries product ids and \
                    quantities, never amounts — and stock only ever moves through \
                    an atomic conditional update, so two tills cannot sell the \
                    same last item.

                    Authentication is a later phase; every endpoint here is \
                    currently open.
                    """)
                .contact(new Contact().name("Ranmini Hardware"))
                .license(new License().name("Proprietary")));
  }
}
