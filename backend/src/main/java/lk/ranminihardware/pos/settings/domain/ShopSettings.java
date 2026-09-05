package lk.ranminihardware.pos.settings.domain;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

/**
 * The shop's configuration — one document, four sections.
 *
 * <p>A single document with a fixed id rather than a key/value collection. The
 * settings are always read together and always written a section at a time, so
 * one document means one read (cached) and no chance of the four sections
 * disagreeing halfway through a save. The fixed id is what makes "create it if
 * it is missing" idempotent on a fresh database.
 *
 * <p>The sections mirror the four settings screens exactly, so a form maps to a
 * nested object rather than to a scatter of top-level fields.
 */
@Document(collection = "settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopSettings {

  /** There is one shop, so there is one settings document. */
  public static final String SINGLETON_ID = "shop";

  @Id @Builder.Default private String id = SINGLETON_ID;

  /**
   * When the shop's logo was last replaced, or null when there is none.
   *
   * <p>Top-level rather than inside {@link ShopProfile}, and deliberately so:
   * the profile section is overwritten wholesale every time that form is saved,
   * built from the request's five text fields. A logo stamp living inside it
   * would be erased the next time somebody corrected the shop's phone number.
   *
   * <p>It is the whole reason the bytes can live in another collection: it says
   * whether a logo exists without reading it, and changes whenever the image
   * does, which is what lets the image URL be cached forever.
   */
  private Instant logoUpdatedAt;

  private ShopProfile profile;
  private BusinessLogic businessLogic;
  private Receipts receipts;
  private Security security;

  @LastModifiedDate private Instant updatedAt;

  @Version private Long version;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ShopProfile {
    private String companyName;
    private String registrationNumber;
    private String primaryAddress;
    private String contactEmail;
    private String contactPhone;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BusinessLogic {
    /** Percentage, e.g. 15 for 15%. Applied at checkout. */
    private BigDecimal taxRate;

    /**
     * Default reorder level for new products.
     *
     * <p>Note that each product carries its own level; this is only the starting
     * value. A shop that reorders cement at 20 bags does not reorder washers at
     * 20 washers, so a single global threshold would be useless in practice.
     */
    private int lowStockThreshold;

    private String currencySymbol;

    /**
     * How stock on hand is valued. WEIGHTED_AVERAGE is the only value the
     * service implements, and the only one the endpoint accepts.
     */
    private String stockValuation;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Receipts {
    /** Leading part of every invoice number, e.g. "INV". */
    private String receiptPrefix;

    private String footerMessage;
    private String paperSize;
    private boolean showLogo;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Security {
    private int sessionTimeoutMinutes;

    /**
     * Minimum password length.
     *
     * <p>The service floors this at 8 regardless of what is stored: letting the
     * shop configure a weaker password than the sign-in form already enforces
     * would silently undermine every account in the system.
     */
    private int minPasswordLength;

    private int lockoutThreshold;
    private boolean auditLogEnabled;
  }

  /** The values a brand-new installation starts with. */
  public static ShopSettings defaults() {
    return ShopSettings.builder()
        .id(SINGLETON_ID)
        .profile(
            ShopProfile.builder()
                .companyName("Ranmini Hardware")
                .registrationNumber("")
                .primaryAddress("")
                .contactEmail("")
                .contactPhone("")
                .build())
        .businessLogic(
            BusinessLogic.builder()
                .taxRate(BigDecimal.ZERO)
                .lowStockThreshold(20)
                .currencySymbol("Rs.")
                .stockValuation("WEIGHTED_AVERAGE")
                .build())
        .receipts(
            Receipts.builder()
                .receiptPrefix("INV")
                .footerMessage("Thank you for shopping with Ranmini Hardware.")
                .paperSize("80MM")
                .showLogo(true)
                .build())
        .security(
            Security.builder()
                .sessionTimeoutMinutes(30)
                .minPasswordLength(8)
                .lockoutThreshold(8)
                .auditLogEnabled(true)
                .build())
        .build();
  }
}
