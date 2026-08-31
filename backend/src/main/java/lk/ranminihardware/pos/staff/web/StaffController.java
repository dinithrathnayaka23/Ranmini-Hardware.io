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
import lk.ranminihardware.pos.staff.service.StaffService;
import org.springframework.data.domain.Pageable;
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
  private final PageQuery pageQuery;

  public StaffController(StaffService staff, PageQuery pageQuery) {
    this.staff = staff;
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
    return Response.from(staff.create(request.toWrite(), request.password()));
  }

  @PutMapping("/{id}")
  public Response update(@PathVariable String id, @Valid @RequestBody UpdateRequest request) {
    return Response.from(staff.update(id, request.toWrite()));
  }

  @PostMapping("/{id}/password")
  public Response changePassword(
      @PathVariable String id, @Valid @RequestBody PasswordRequest request) {
    return Response.from(staff.changePassword(id, request.password()));
  }

  @DeleteMapping("/{id}")
  public Response deactivate(@PathVariable String id) {
    return Response.from(staff.deactivate(id));
  }

  @PostMapping("/{id}/reactivate")
  public Response reactivate(@PathVariable String id) {
    return Response.from(staff.reactivate(id));
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
      Instant lastActiveAt) {

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
          m.getLastActiveAt());
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
