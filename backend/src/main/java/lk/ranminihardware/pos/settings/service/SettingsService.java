package lk.ranminihardware.pos.settings.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import lk.ranminihardware.pos.settings.domain.ShopLogo;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.repository.ShopLogoRepository;
import lk.ranminihardware.pos.settings.repository.ShopSettingsRepository;
import lk.ranminihardware.pos.shared.media.ImageBytes;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Reads and writes the shop's configuration.
 *
 * <p>Cached, because checkout reads the tax rate and the receipt prefix on every
 * single sale while the shop changes them perhaps twice a year. Going to Mongo
 * for that on each transaction would be a round trip bought for nothing. Every
 * write evicts the cache, so a change takes effect on the next sale rather than
 * whenever the TTL happens to expire.
 */
@Service
public class SettingsService {

  private static final String CACHE = "shopSettings";

  /**
   * Floor on the configurable minimum password length.
   *
   * <p>Enforced here rather than trusted from the document: the sign-in and
   * staff forms already require 8, and letting a stored setting undercut them
   * would quietly weaken every account in the system.
   */
  private static final int ABSOLUTE_MIN_PASSWORD_LENGTH = 8;

  /**
   * Bounds on the configurable session length.
   *
   * <p>Five minutes is short enough for a shop that wants the till locking
   * behind a distracted cashier; a day is the longest a signed token should
   * live when it cannot be revoked before it expires.
   */
  private static final int MIN_SESSION_MINUTES = 5;

  private static final int MAX_SESSION_MINUTES = 1440;

  /** The one stock valuation method this service implements. */
  public static final String WEIGHTED_AVERAGE = "WEIGHTED_AVERAGE";

  private final ShopSettingsRepository repository;
  private final ShopLogoRepository logos;
  private final Clock clock;

  public SettingsService(
      ShopSettingsRepository repository, ShopLogoRepository logos, Clock clock) {
    this.repository = repository;
    this.logos = logos;
    this.clock = clock;
  }

  /**
   * The current settings, creating the defaults on a fresh database.
   *
   * <p>Self-healing on purpose: a first boot against an empty Mongo should give
   * a working shop, not a null pointer on the first sale.
   */
  @Cacheable(CACHE)
  public ShopSettings get() {
    return repository
        .findById(ShopSettings.SINGLETON_ID)
        .orElseGet(() -> repository.save(ShopSettings.defaults()));
  }

  @CacheEvict(value = CACHE, allEntries = true)
  public ShopSettings updateProfile(ShopSettings.ShopProfile profile) {
    ShopSettings settings = get();
    settings.setProfile(profile);
    return repository.save(settings);
  }

  @CacheEvict(value = CACHE, allEntries = true)
  public ShopSettings updateBusinessLogic(ShopSettings.BusinessLogic businessLogic) {
    ShopSettings settings = get();
    settings.setBusinessLogic(businessLogic);
    return repository.save(settings);
  }

  @CacheEvict(value = CACHE, allEntries = true)
  public ShopSettings updateReceipts(ShopSettings.Receipts receipts) {
    ShopSettings settings = get();
    settings.setReceipts(receipts);
    return repository.save(settings);
  }

  @CacheEvict(value = CACHE, allEntries = true)
  public ShopSettings updateSecurity(ShopSettings.Security security) {
    security.setMinPasswordLength(
        Math.max(ABSOLUTE_MIN_PASSWORD_LENGTH, security.getMinPasswordLength()));

    ShopSettings settings = get();
    settings.setSecurity(security);
    return repository.save(settings);
  }

  /** Tax percentage applied at checkout, e.g. 15 for 15%. */
  public BigDecimal taxRate() {
    BigDecimal rate = get().getBusinessLogic().getTaxRate();
    return rate == null ? BigDecimal.ZERO : rate;
  }

  /**
   * The shop's currency symbol.
   *
   * <p>Defaulted here rather than at each call site, so a settings document
   * written before this field existed cannot leave a screen printing prices with
   * no symbol at all.
   */
  public String currencySymbol() {
    String symbol = get().getBusinessLogic().getCurrencySymbol();
    return symbol == null || symbol.isBlank() ? "Rs." : symbol;
  }

  /** Leading part of every invoice number. */
  public String receiptPrefix() {
    String prefix = get().getReceipts().getReceiptPrefix();
    return prefix == null || prefix.isBlank() ? "INV" : prefix;
  }

  /**
   * Whether actions are recorded to the audit log.
   *
   * <p>Read on every auditable action, which is why it goes through the cache
   * rather than to Mongo: the switch changes perhaps once in the life of the
   * shop, and a database read per voided sale to ask a question with the same
   * answer every time would be a round trip bought for nothing.
   */
  public boolean isAuditLogEnabled() {
    return get().getSecurity().isAuditLogEnabled();
  }

  /**
   * How long a signed-in session lasts before the token must be refreshed.
   *
   * <p>Clamped rather than trusted. The value reaches the database through a
   * validated endpoint today, but a document written by an older version — or
   * edited by hand — must not be able to mint a token that lasts a year, or one
   * so short that the till re-authenticates between customers.
   */
  public int sessionTimeoutMinutes() {
    int minutes = get().getSecurity().getSessionTimeoutMinutes();
    return Math.clamp(minutes, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES);
  }

  /**
   * How stock on hand is valued.
   *
   * <p>Coerced to weighted average, which is the only method this service
   * implements. A document holding the FIFO that an earlier version of the
   * settings form offered would otherwise name a costing rule that nothing
   * applies — see {@code ProductService.adjustStock} for what actually happens
   * when stock is received.
   */
  public String stockValuation() {
    // Every stored value maps to the same answer today, because weighted
    // average is the only method implemented — including the FIFO an earlier
    // version of the settings form offered. The method exists so the call site
    // reads as a question about the shop's rule rather than a hardcoded
    // constant, and so adding FIFO later is a change here rather than a hunt
    // through the catalogue.
    return WEIGHTED_AVERAGE;
  }

  /** Default reorder level applied to newly created products. */
  public int defaultLowStockThreshold() {
    return get().getBusinessLogic().getLowStockThreshold();
  }

  // ---------------------------------------------------------------- the logo

  /**
   * Stores the shop's logo, replacing whatever was there.
   *
   * <p>The bytes are validated before anything is written, by the same check
   * every other upload in this service uses. That check is the reason SVG is
   * not accepted here even though the settings screen originally offered it: an
   * SVG is a script-bearing document, and this image is rendered back into the
   * administrator's own portal, so accepting one would turn the logo picker
   * into stored cross-site scripting against the person most worth attacking.
   *
   * <p>The stamp on the settings document and the bytes are written together,
   * settings last. If the second write fails the shop keeps the old stamp and
   * the old image is still the one being served — a stale logo, rather than a
   * settings document pointing at an image that was never stored.
   */
  @CacheEvict(value = CACHE, allEntries = true)
  public ShopSettings setLogo(byte[] data, String contentType) {
    ImageBytes.validate(data, contentType, ImageBytes.MAX_LOGO_BYTES);

    Instant now = Instant.now(clock);

    logos.save(
        ShopLogo.builder()
            .id(ShopLogo.SINGLETON_ID)
            .contentType(ImageBytes.normaliseType(contentType))
            .data(data)
            .updatedAt(now)
            .build());

    ShopSettings settings = get();
    settings.setLogoUpdatedAt(now);
    return repository.save(settings);
  }

  /**
   * Removes the logo.
   *
   * <p>Clears the stamp first. A receipt that briefly prints without a logo is
   * a cosmetic fault; one that asks for an image already deleted is a broken
   * picture on a customer's copy.
   */
  @CacheEvict(value = CACHE, allEntries = true)
  public ShopSettings removeLogo() {
    ShopSettings settings = get();
    settings.setLogoUpdatedAt(null);
    ShopSettings saved = repository.save(settings);

    logos.deleteById(ShopLogo.SINGLETON_ID);
    return saved;
  }

  /** The logo bytes, or empty when the shop has not set one. */
  public Optional<ShopLogo> findLogo() {
    return logos.findById(ShopLogo.SINGLETON_ID);
  }
}
