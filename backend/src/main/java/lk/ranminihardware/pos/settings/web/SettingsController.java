package lk.ranminihardware.pos.settings.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lk.ranminihardware.pos.audit.domain.AuditAction;
import lk.ranminihardware.pos.audit.service.AuditService;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.service.SettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Shop configuration.
 *
 * <p>Read as one document, written a section at a time — matching the four
 * settings screens. PATCH per section rather than PUT of the whole thing, so
 * saving the receipt footer cannot silently revert a tax rate somebody changed
 * on another tab a minute earlier.
 */
@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {

  private final SettingsService settings;
  private final AuditService audit;

  /**
   * <p>The audit entry is written here rather than inside {@link SettingsService},
   * deliberately: the audit service asks the settings whether logging is even
   * switched on, so a settings service that called it back would be a cycle.
   */
  public SettingsController(SettingsService settings, AuditService audit) {
    this.settings = settings;
    this.audit = audit;
  }

  /**
   * Records that a section was saved.
   *
   * <p>Called after the save returns, never before: an entry written first
   * would claim a change that a failed validation or a lost connection never
   * actually made.
   *
   * <p>The section, not the values. Two of these documents carry the shop's
   * security policy, and copying a lockout threshold or a session length into a
   * second collection — one with a two-year retention — gives an attacker who
   * reaches the log a map of the shop's defences. Knowing who changed the
   * security settings and when is the fact worth keeping; what they changed
   * them to is readable from the settings themselves.
   */
  private void recordChange(String section) {
    audit.record(
        AuditAction.SETTINGS_CHANGED,
        "SETTINGS",
        section,
        "Saved the %s settings.".formatted(section));
  }

  @GetMapping
  public ShopSettings get() {
    return settings.get();
  }

  /**
   * What any signed-in screen may know about the shop.
   *
   * <p>The full settings document is administrator-only, and rightly so — it
   * carries the lockout threshold and the session policy. But the till needs the
   * currency symbol to price a basket and the shop's name and footer to print a
   * receipt, and a cashier is refused the admin endpoint.
   *
   * <p>Everything here is printed on a receipt that gets handed to a customer,
   * so none of it is a disclosure. What is deliberately absent is the whole
   * security section, the registration number and the contact email — none of
   * which a till has any use for.
   */
  @GetMapping("/public")
  public ResponseEntity<PublicSettings> getPublic() {
    ShopSettings shop = settings.get();

    PublicSettings body =
        new PublicSettings(
            shop.getProfile().getCompanyName(),
            shop.getProfile().getPrimaryAddress(),
            shop.getProfile().getContactPhone(),
            settings.currencySymbol(),
            settings.taxRate(),
            shop.getBusinessLogic().getLowStockThreshold(),
            shop.getReceipts().getReceiptPrefix(),
            shop.getReceipts().getFooterMessage(),
            shop.getReceipts().getPaperSize(),
            shop.getReceipts().isShowLogo());

    return ResponseEntity.ok()
        // Read on nearly every page render and changed perhaps twice a year, so
        // a short shared window costs nothing and saves a round trip per screen.
        // Short rather than long because a currency change must not need a
        // sign-out to take effect.
        .header("Cache-Control", "private, max-age=60")
        .body(body);
  }

  @PatchMapping("/profile")
  public ShopSettings updateProfile(@Valid @RequestBody ProfileRequest request) {
    ShopSettings saved =
        settings.updateProfile(
            ShopSettings.ShopProfile.builder()
                .companyName(request.companyName())
                .registrationNumber(request.registrationNumber())
                .primaryAddress(request.primaryAddress())
                .contactEmail(request.contactEmail())
                .contactPhone(request.contactPhone())
                .build());

    recordChange("profile");
    return saved;
  }

  @PatchMapping("/business-logic")
  public ShopSettings updateBusinessLogic(@Valid @RequestBody BusinessLogicRequest request) {
    ShopSettings saved =
        settings.updateBusinessLogic(
            ShopSettings.BusinessLogic.builder()
                .taxRate(request.taxRate())
                .lowStockThreshold(request.lowStockThreshold())
                .currencySymbol(request.currencySymbol())
                .stockValuation(request.stockValuation())
                .build());

    recordChange("business logic");
    return saved;
  }

  @PatchMapping("/receipts")
  public ShopSettings updateReceipts(@Valid @RequestBody ReceiptsRequest request) {
    ShopSettings saved =
        settings.updateReceipts(
            ShopSettings.Receipts.builder()
                .receiptPrefix(request.receiptPrefix())
                .footerMessage(request.footerMessage())
                .paperSize(request.paperSize())
                .showLogo(request.showLogo())
                .build());

    recordChange("receipt");
    return saved;
  }

  @PatchMapping("/security")
  public ShopSettings updateSecurity(@Valid @RequestBody SecurityRequest request) {
    boolean wasEnabled = settings.isAuditLogEnabled();

    ShopSettings saved =
        settings.updateSecurity(
            ShopSettings.Security.builder()
                .sessionTimeoutMinutes(request.sessionTimeoutMinutes())
                .minPasswordLength(request.minPasswordLength())
                .lockoutThreshold(request.lockoutThreshold())
                .auditLogEnabled(request.auditLogEnabled())
                .build());

    // Switching the log off is the one change that has to be recorded after it
    // has already taken effect, or the trail simply stops with no explanation.
    if (wasEnabled && !request.auditLogEnabled()) {
      audit.recordLoggingDisabled();
    } else {
      recordChange("security");
    }

    return saved;
  }

  // The constraints below mirror the frontend's Zod schemas exactly. They are
  // repeated rather than shared because this endpoint is publicly reachable and
  // the browser's copy is a convenience, not a control.

  public record ProfileRequest(
      @NotBlank(message = "Enter the registered business name.") @Size(min = 2, max = 120)
          String companyName,
      @NotBlank(message = "Enter the business registration number.") @Size(min = 3, max = 40)
          String registrationNumber,
      @NotBlank(message = "Enter the full trading address.") @Size(min = 10, max = 240)
          String primaryAddress,
      @NotBlank @Email(message = "Enter a valid email address.") String contactEmail,
      @NotBlank @Size(min = 7, max = 24)
          @Pattern(
              regexp = "^[0-9+()\\s-]+$",
              message = "Only digits, spaces and + ( ) - are allowed.")
          String contactPhone) {}

  public record BusinessLogicRequest(
      @NotNull(message = "Enter a tax rate.")
          @DecimalMin(value = "0.0", message = "Tax rate cannot be negative.")
          @DecimalMax(value = "100.0", message = "Tax rate cannot exceed 100%.")
          BigDecimal taxRate,
      @Min(value = 1, message = "Threshold must be at least 1.")
          @Max(value = 10_000, message = "Threshold must be at most 10,000.")
          int lowStockThreshold,
      @NotNull @Pattern(regexp = "^(Rs\\.|\\$)$", message = "Select a currency.")
          String currencySymbol,
      /**
       * How stock on hand is valued.
       *
       * <p>Weighted average only. FIFO was offered here and implemented
       * nowhere: it needs a cost layer stored per delivery and consumed in
       * order on every sale, which is a real inventory-accounting feature and a
       * much larger one than this. Accepting a value the service does not honour
       * is how a setting becomes a lie, so the endpoint now refuses it.
       */
      @NotNull
          @Pattern(
              regexp = "^WEIGHTED_AVERAGE$",
              message = "Stock is valued at weighted average cost.")
          String stockValuation) {}

  /**
   * The shop as every screen needs to render it.
   *
   * @param taxRate a percentage, e.g. 15 for 15%. Sent so the till can show a
   *     tax line while it builds an order — the figure that is actually charged
   *     is still computed by the server at checkout.
   * @param lowStockThreshold the reorder level a new product starts on. A
   *     starting value for the add-product form, not a rule: each product
   *     carries its own level, because a shop that reorders cement at twenty
   *     bags does not reorder washers at twenty washers.
   */
  public record PublicSettings(
      String companyName,
      String primaryAddress,
      String contactPhone,
      String currencySymbol,
      BigDecimal taxRate,
      int lowStockThreshold,
      String receiptPrefix,
      String footerMessage,
      String paperSize,
      boolean showLogo) {}

  public record ReceiptsRequest(
      @NotBlank(message = "Enter a prefix.")
          @Size(max = 10, message = "Prefix must be at most 10 characters.")
          @Pattern(
              regexp = "^[A-Z0-9-]+$",
              message = "Use capital letters, digits and hyphens only.")
          String receiptPrefix,
      @Size(max = 160, message = "Footer must be at most 160 characters.") String footerMessage,
      @NotNull @Pattern(regexp = "^(80MM|58MM|A4)$", message = "Select a paper size.")
          String paperSize,
      boolean showLogo) {}

  public record SecurityRequest(
      @Min(value = 5, message = "Session timeout is too short.")
          @Max(value = 1440, message = "Session timeout is too long.")
          int sessionTimeoutMinutes,
      // The service floors this at 8 regardless of what is sent, so a shop
      // cannot configure a password weaker than the sign-in form requires.
      @Min(value = 8, message = "Minimum length cannot be below 8 characters.")
          @Max(value = 64, message = "Minimum length must be at most 64 characters.")
          int minPasswordLength,
      @Min(value = 3, message = "Allow at least 3 attempts.")
          @Max(value = 20, message = "Allow at most 20 attempts.")
          int lockoutThreshold,
      boolean auditLogEnabled) {}
}
