package lk.ranminihardware.pos.auth.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lk.ranminihardware.pos.auth.service.JwtService;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Turns a bearer token into an authenticated request.
 *
 * <p>Deliberately does not reject anything. A missing or invalid token simply
 * leaves the request unauthenticated, and Spring Security's authorisation rules
 * decide what that means for the endpoint being called. Rejecting here would
 * duplicate that decision in two places and make the public endpoints — sign-in,
 * health — awkward special cases.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final String HEADER = "Authorization";
  private static final String PREFIX = "Bearer ";

  private final JwtService jwt;

  public JwtAuthenticationFilter(JwtService jwt) {
    this.jwt = jwt;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain chain)
      throws ServletException, IOException {

    String header = request.getHeader(HEADER);

    if (header != null && header.startsWith(PREFIX)) {
      jwt.verifyAccessToken(header.substring(PREFIX.length()))
          .ifPresent(
              user -> {
                // The role becomes a Spring authority so endpoints can be
                // guarded declaratively. No database read: the token was signed
                // by this service and carries everything the check needs.
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.role()));

                // The whole record is the principal, so an endpoint that needs
                // the signed-in person's id or name reads it from the verified
                // token rather than trusting a field in the request body.
                var authentication =
                    new UsernamePasswordAuthenticationToken(user, null, authorities);
                authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
              });
    }

    chain.doFilter(request, response);
  }
}
