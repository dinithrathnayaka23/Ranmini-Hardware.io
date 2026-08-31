package lk.ranminihardware.pos.shared.config;

import java.util.List;
import lk.ranminihardware.pos.auth.web.JwtAuthenticationFilter;
import lk.ranminihardware.pos.shared.error.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Who may call what.
 *
 * <p>The rules are written as a deny-by-default list: {@code anyRequest()
 * .authenticated()} is the last line, so a new endpoint added tomorrow is
 * protected until somebody deliberately opens it. The opposite arrangement —
 * listing what to protect — means every forgotten endpoint is public.
 *
 * <p>Three tiers:
 *
 * <ul>
 *   <li><b>Open:</b> sign-in and health. Nothing else.
 *   <li><b>Till:</b> the catalogue read and checkout, for CASHIER or ADMIN, so
 *       the owner can cover the counter without a second account.
 *   <li><b>Portal:</b> everything else — inventory, staff, settings, reports —
 *       ADMIN only.
 * </ul>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final CorsProperties corsProperties;

  public SecurityConfig(CorsProperties corsProperties) {
    this.corsProperties = corsProperties;
  }

  @Bean
  public SecurityFilterChain filterChain(
      HttpSecurity http, JwtAuthenticationFilter jwtFilter, ObjectMapper json) throws Exception {

    http
        // CSRF protection is for cookie-authenticated browsers. This API is
        // authenticated by a bearer token that a cross-site form post cannot
        // attach, so the protection would add a token exchange for no gain.
        // The cookies live in the Next.js layer, which has its own SameSite
        // defence.
        .csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))

        // No server-side session: the token is the session. Anything else needs
        // sticky routing or a shared store the moment there is a second
        // instance.
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

        .authorizeHttpRequests(
            auth ->
                auth
                    // Sign-in has to be reachable without being signed in.
                    .requestMatchers("/api/v1/auth/*/login", "/api/v1/auth/refresh")
                    .permitAll()

                    // Liveness and readiness, for the shop's monitoring.
                    .requestMatchers("/actuator/health", "/actuator/health/**")
                    .permitAll()

                    // CORS preflight carries no credentials by definition.
                    .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()

                    // The till: read the catalogue, ring up a sale.
                    .requestMatchers("/api/v1/pos/**")
                    .hasAnyRole("CASHIER", "ADMIN")

                    // A cashier needs the category chips to filter the grid.
                    .requestMatchers(HttpMethod.GET, "/api/v1/categories")
                    .hasAnyRole("CASHIER", "ADMIN")

                    // Reading back a receipt to reprint it is part of the job.
                    .requestMatchers(HttpMethod.GET, "/api/v1/sales/by-invoice/**")
                    .hasAnyRole("CASHIER", "ADMIN")

                    // Everything else in the management portal.
                    .requestMatchers("/api/v1/inventory/**", "/api/v1/staff/**",
                        "/api/v1/settings/**", "/api/v1/reports/**", "/api/v1/dashboard/**",
                        "/api/v1/sales/**", "/api/v1/categories/**")
                    .hasRole("ADMIN")

                    // Deny by default. New endpoints are protected until opened.
                    .anyRequest()
                    .authenticated())

        .exceptionHandling(
            handling ->
                handling
                    .authenticationEntryPoint(
                        (request, response, ex) ->
                            writeError(
                                json,
                                response,
                                request.getRequestURI(),
                                HttpStatus.UNAUTHORIZED,
                                "UNAUTHENTICATED",
                                "Please sign in to continue."))
                    .accessDeniedHandler(
                        (request, response, ex) ->
                            writeError(
                                json,
                                response,
                                request.getRequestURI(),
                                HttpStatus.FORBIDDEN,
                                "FORBIDDEN",
                                "Your account does not have access to that.")))

        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  /**
   * Failures come back in the same envelope as every other error.
   *
   * <p>Without this, Spring Security answers with its own HTML page or an empty
   * body, and the frontend — which parses one error shape everywhere — would
   * show "something went wrong" instead of "please sign in".
   */
  private void writeError(
      ObjectMapper json,
      jakarta.servlet.http.HttpServletResponse response,
      String path,
      HttpStatus status,
      String code,
      String message)
      throws java.io.IOException {

    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    json.writeValue(response.getWriter(), ApiError.of(status.value(), code, message, path));
  }

  /**
   * BCrypt at the library default cost.
   *
   * <p>Roughly 100ms on modest hardware, which is the point: slow enough to make
   * offline guessing expensive, fast enough that a cashier does not notice it.
   * The cost is recorded inside each hash, so raising it later leaves existing
   * passwords verifiable.
   */
  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(corsProperties.allowedOrigins());
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
  }
}
