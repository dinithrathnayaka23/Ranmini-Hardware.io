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
 * <p>Served only when {@code API_DOCS_ENABLED=true}, which is meant for a
 * development machine. Production leaves it off, so a deployed service publishes
 * no endpoint index for anyone probing it. See {@code springdoc} in
 * application.yml and the matching rule in SecurityConfig.
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

                    Every endpoint except sign-in, password recovery and health \
                    requires a bearer token. The till's endpoints accept a \
                    cashier's token and the management endpoints an \
                    administrator's.
                    """)
                .contact(new Contact().name("Ranmini Hardware"))
                .license(new License().name("Proprietary")));
  }
}
