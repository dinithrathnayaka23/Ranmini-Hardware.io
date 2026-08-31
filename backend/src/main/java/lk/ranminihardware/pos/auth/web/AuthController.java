package lk.ranminihardware.pos.auth.web;

import jakarta.validation.Valid;
import java.util.Set;
import lk.ranminihardware.pos.auth.service.AuthService;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sign-in, session refresh, and "who am I".
 *
 * <p>The portal is a path segment — {@code /auth/admin/login} and
 * {@code /auth/cashier/login} — rather than a field in the body. That matches
 * what the frontend already calls, and it means the portal is known before the
 * request body is read.
 *
 * <p>To be clear about what the split does and does not buy: it is <b>not</b> a
 * security boundary on its own. The boundary is in {@code AuthService}, which
 * checks the authenticated account's role against the portal. The separate paths
 * exist so each door can be rate-limited and audited independently.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private static final Set<String> PORTALS = Set.of("admin", "cashier");

  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  @PostMapping("/{portal}/login")
  public ResponseEntity<AuthDtos.LoginResponse> login(
      @PathVariable String portal, @Valid @RequestBody AuthDtos.LoginRequest request) {

    // A path segment is attacker-controlled text; narrow it before it reaches
    // anything that makes a decision with it.
    if (!PORTALS.contains(portal)) {
      throw ApiException.notFound("Portal", portal);
    }

    return ResponseEntity.ok()
        // A credential response must never be cached, by the browser or by
        // anything between here and it.
        .header("Cache-Control", "no-store")
        .body(auth.login(portal, request.username(), request.password()));
  }

  @PostMapping("/refresh")
  public ResponseEntity<AuthDtos.LoginResponse> refresh(
      @Valid @RequestBody AuthDtos.RefreshRequest request) {
    return ResponseEntity.ok()
        .header("Cache-Control", "no-store")
        .body(auth.refresh(request.refreshToken()));
  }

  /**
   * The signed-in user, for the portal chrome.
   *
   * <p>Reads the username from the verified token rather than from a parameter:
   * an endpoint that told you about whoever you named would be an account
   * directory with extra steps.
   */
  @GetMapping("/me")
  public AuthDtos.UserResponse me(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "Your session has ended. Please sign in again.");
    }
    return auth.currentUser(authentication.getName());
  }
}
