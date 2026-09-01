package lk.ranminihardware.pos.staff.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.service.ProfileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Your own account.
 *
 * <p>Every endpoint here acts on whoever the token says you are. There is no id
 * in any path or body, so there is no authorisation check to get wrong — the
 * only account reachable through this controller is the caller's own.
 *
 * <p>Open to any signed-in role, not just administrators: a cashier owns their
 * name and their password too.
 */
@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {

  private final ProfileService profiles;

  public ProfileController(ProfileService profiles) {
    this.profiles = profiles;
  }

  @GetMapping
  public Response get(Authentication authentication) {
    return Response.from(profiles.get(username(authentication)));
  }

  @PatchMapping
  public Response updateDetails(
      Authentication authentication, @Valid @RequestBody DetailsRequest request) {

    return Response.from(
        profiles.updateDetails(
            username(authentication), request.fullName(), request.email(), request.phone()));
  }

  /**
   * Changes your own password.
   *
   * <p>POST rather than PATCH because it is not a partial update of the profile
   * resource — it is an operation with its own precondition, namely knowing the
   * current password.
   */
  @PostMapping("/password")
  public Response changePassword(
      Authentication authentication, @Valid @RequestBody PasswordRequest request) {

    profiles.changePassword(
        username(authentication), request.currentPassword(), request.newPassword());

    // The updated record, not a bare 204: the client re-renders the profile
    // screen afterwards and would otherwise need a second request for it.
    return Response.from(profiles.get(username(authentication)));
  }

  @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Response uploadAvatar(
      Authentication authentication, @RequestParam("file") MultipartFile file) {

    if (file == null || file.isEmpty()) {
      throw ApiException.badRequest("EMPTY_IMAGE", "Choose a picture to upload.");
    }

    try {
      return Response.from(
          profiles.setAvatar(username(authentication), file.getBytes(), file.getContentType()));
    } catch (IOException ex) {
      throw ApiException.badRequest("UNREADABLE_IMAGE", "That file could not be read.");
    }
  }

  @DeleteMapping("/avatar")
  public Response removeAvatar(Authentication authentication) {
    return Response.from(profiles.removeAvatar(username(authentication)));
  }

  /**
   * The signed-in person's own picture.
   *
   * <p>Served from this controller rather than a staff-scoped one so it needs no
   * id and no ownership check. The portal's other avatars — the staff list —
   * come from the staff endpoint, which is administrator-only.
   */
  @GetMapping("/avatar")
  public ResponseEntity<byte[]> avatar(Authentication authentication) {
    StaffMember member = profiles.get(username(authentication));
    return serveAvatar(profiles, member);
  }

  /**
   * Writes an avatar response, or 404 when the person has no picture.
   *
   * <p>Shared with the staff controller so both serve pictures with the same
   * caching and the same headers.
   */
  static ResponseEntity<byte[]> serveAvatar(ProfileService profiles, StaffMember member) {
    if (member.getAvatarVersion() == null) {
      return ResponseEntity.notFound().build();
    }

    return profiles
        .findAvatar(member.getId())
        .map(
            avatar ->
                ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(avatar.getContentType()))
                    // Immutable: the URL carries the version, so a new picture
                    // is a new URL and this one can never go stale.
                    .header("Cache-Control", "private, max-age=31536000, immutable")
                    // The bytes were signature-checked on upload, but a browser
                    // that sniffs its own type would make that check pointless.
                    .header("X-Content-Type-Options", "nosniff")
                    .body(avatar.getData()))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  private static String username(Authentication authentication) {
    if (authentication == null || authentication.getName() == null) {
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Please sign in to continue.");
    }
    return authentication.getName();
  }

  /**
   * A person's own account, as they see it.
   *
   * <p>Carries more than {@code /auth/me} does — phone and joining date — because
   * this is the screen for editing them. Still no password hash, no lockout
   * state, and no failure count.
   */
  public record Response(
      String id,
      String fullName,
      String username,
      String email,
      String phone,
      StaffRole role,
      LocalDate joinedOn,
      Instant lastActiveAt,
      /** Null when there is no picture; otherwise the cache-busting token. */
      Instant avatarVersion) {

    static Response from(StaffMember m) {
      return new Response(
          m.getId(),
          m.getFullName(),
          m.getUsername(),
          m.getEmail(),
          m.getPhone(),
          m.getRole(),
          m.getJoinedOn(),
          m.getLastActiveAt(),
          m.getAvatarVersion());
    }
  }

  /**
   * The details a person may change about themselves.
   *
   * <p>Username, role and status are absent on purpose. The username is the
   * identity every sale refers to; the other two are the account's own
   * privileges, and letting it edit those is privilege escalation with extra
   * steps.
   */
  public record DetailsRequest(
      @NotBlank(message = "Enter your full name.")
          @Size(max = 120, message = "Name must be at most 120 characters.")
          String fullName,
      @Email(message = "Enter a valid email address.")
          @Size(max = 160, message = "Email must be at most 160 characters.")
          String email,
      @Size(max = 24, message = "Contact number must be at most 24 characters.")
          @Pattern(
              regexp = "^[0-9+()\\s-]*$",
              message = "Only digits, spaces and + ( ) - are allowed.")
          String phone) {}

  public record PasswordRequest(
      @NotBlank(message = "Enter your current password.") String currentPassword,
      @NotBlank(message = "Enter a new password.") String newPassword) {}
}
