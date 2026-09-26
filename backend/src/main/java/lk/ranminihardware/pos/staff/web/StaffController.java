package lk.ranminihardware.pos.staff.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import lk.ranminihardware.pos.shared.web.PageQuery;
import lk.ranminihardware.pos.shared.web.PageResponse;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.audit.domain.AuditAction;
import lk.ranminihardware.pos.audit.service.AuditService;
import lk.ranminihardware.pos.staff.service.ProfileService;
import lk.ranminihardware.pos.staff.service.StaffService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Staff accounts — the people who work the shop. */
@RestController
@RequestMapping("/api/v1/staff")
public class StaffController {

  private static final Set<String> SORTABLE = Set.of("fullName", "createdAt");
  private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.ASC, "fullName");

  private final StaffService staff;
  private final ProfileService profiles;
  private final AuditService audit;
  private final PageQuery pageQuery;

  public StaffController(
      StaffService staff,
      ProfileService profiles,
      AuditService audit,
      PageQuery pageQuery) {
    this.staff = staff;
    this.profiles = profiles;
    this.audit = audit;
    this.pageQuery = pageQuery;
  }

  @GetMapping
  public PageResponse<Response> list(
      @RequestParam(required = false) StaffStatus status,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size,
      @RequestParam(required = false) String sort) {

    Pageable pageable = pageQuery.build(page, size, sort, SORTABLE, DEFAULT_SORT);
    return PageResponse.from(staff.list(status, pageable), Response::from);
  }

  @GetMapping("/{id}")
  public Response get(@PathVariable String id) {
    return Response.from(staff.get(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Response create(@Valid @RequestBody CreateRequest request) {
    StaffMember created = staff.create(request.toWrite(), request.password());

    audit.record(
        AuditAction.STAFF_CREATED,
        "STAFF",
        created.getId(),
        "Created the %s account \"%s\" for %s."
            .formatted(created.getRole(), created.getUsername(), created.getFullName()));

    return Response.from(created);
  }

  @PutMapping("/{id}")
  public Response update(@PathVariable String id, @Valid @RequestBody UpdateRequest request) {
    // Read first, so the entry can say what the role changed from. Only the
    // role is audited: a corrected phone number is not a security event, and
    // logging every profile edit would bury the one that is.
    StaffRole before = staff.get(id).getRole();
    StaffMember updated = staff.update(id, request.toWrite());

    if (before != updated.getRole()) {
      audit.record(
          AuditAction.STAFF_ROLE_CHANGED,
          "STAFF",
          updated.getId(),
          "Changed %s from %s to %s."
              .formatted(updated.getFullName(), before, updated.getRole()));
    }

    return Response.from(updated);
  }

  @PostMapping("/{id}/password")
  public Response changePassword(
      @PathVariable String id, @Valid @RequestBody PasswordRequest request) {

    StaffMember member = staff.changePassword(id, request.password());

    // The password itself is never recorded, obviously. That somebody else set
    // it is the fact worth keeping: it is the one way an administrator can take
    // over another person's account.
    audit.record(
        AuditAction.STAFF_PASSWORD_RESET,
        "STAFF",
        member.getId(),
        "Set a new password for %s (%s).".formatted(member.getFullName(), member.getUsername()));

    return Response.from(member);
  }

  @DeleteMapping("/{id}")
  public Response deactivate(@PathVariable String id) {
    StaffMember member = staff.deactivate(id);

    audit.record(
        AuditAction.STAFF_DEACTIVATED,
        "STAFF",
        member.getId(),
        "Deactivated %s (%s). They can no longer sign in."
            .formatted(member.getFullName(), member.getUsername()));

    return Response.from(member);
  }

  /**
   * Another staff member's profile picture, for the staff list.
   *
   * <p>Administrator-only, like the rest of this controller. Somebody editing
   * their own picture uses {@code /api/v1/profile/avatar}, which needs no id.
   */
  @GetMapping("/{id}/avatar")
  public ResponseEntity<byte[]> avatar(@PathVariable String id) {
    return ProfileController.serveAvatar(profiles, staff.get(id));
  }

  @PostMapping("/{id}/reactivate")
  public Response reactivate(@PathVariable String id) {
    StaffMember member = staff.reactivate(id);

    audit.record(
        AuditAction.STAFF_REACTIVATED,
        "STAFF",
        member.getId(),
        "Reactivated %s (%s).".formatted(member.getFullName(), member.getUsername()));

    return Response.from(member);
  }

  /**
   * A staff member as the API returns them.
   *
   * <p>No password hash, no failed-attempt counter, no lockout time. The
   * document carries those; this record is what makes it impossible for them to
   * reach a client by accident.
   */
  public record Response(
      String id,
      String fullName,
      String username,
      String email,
      String phone,
      StaffRole role,
      StaffStatus status,
      LocalDate joinedOn,
      Instant lastActiveAt,
      /** Null when there is no picture; otherwise the cache-busting token. */
      Instant avatarVersion,
      /** Signing in will ask them to replace a password an administrator set. */
      boolean passwordChangeRequired,
      /** When they asked for a reset from the sign-in page; null when no request is open. */
      Instant passwordHelpRequestedAt) {

    static Response from(StaffMember m) {
      return new Response(
          m.getId(),
          m.getFullName(),
          m.getUsername(),
          m.getEmail(),
          m.getPhone(),
          m.getRole(),
          m.getStatus(),
          m.getJoinedOn(),
          m.getLastActiveAt(),
          m.getAvatarVersion(),
          m.isPasswordChangeRequired(),
          m.getPasswordHelpRequestedAt());
    }
  }

  public record CreateRequest(
      @NotBlank(message = "Enter a full name.") @Size(max = 120) String fullName,
      @NotBlank(message = "Enter a username.")
          @Size(min = 3, max = 64, message = "Username must be 3 to 64 characters.")
          @Pattern(
              regexp = "^[a-zA-Z0-9._-]+$",
              message = "Only letters, numbers, dots, underscores and hyphens.")
          String username,
      @Email(message = "Enter a valid email address.") @Size(max = 160) String email,
      @Size(max = 24) @Pattern(regexp = "^[0-9+()\\s-]*$", message = "Only digits, spaces and + ( ) - are allowed.")
          String phone,
      @NotNull(message = "Choose a role.") StaffRole role,
      LocalDate joinedOn,
      // Length is checked against the shop's configured minimum in the service,
      // which floors it at 8 regardless of what is stored.
      @NotBlank(message = "Enter a password.") String password) {

    StaffService.StaffWrite toWrite() {
      return new StaffService.StaffWrite(fullName, username, email, phone, role, joinedOn);
    }
  }

  public record UpdateRequest(
      @NotBlank(message = "Enter a full name.") @Size(max = 120) String fullName,
      @Email(message = "Enter a valid email address.") @Size(max = 160) String email,
      @Size(max = 24) @Pattern(regexp = "^[0-9+()\\s-]*$", message = "Only digits, spaces and + ( ) - are allowed.")
          String phone,
      @NotNull(message = "Choose a role.") StaffRole role,
      LocalDate joinedOn) {

    StaffService.StaffWrite toWrite() {
      // Username is intentionally absent: it is the identity every audit entry
      // refers to, so it is set once at creation and never edited.
      return new StaffService.StaffWrite(fullName, null, email, phone, role, joinedOn);
    }
  }

  public record PasswordRequest(@NotBlank(message = "Enter a password.") String password) {}
}
