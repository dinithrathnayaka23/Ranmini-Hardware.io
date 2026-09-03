package lk.ranminihardware.pos.settings.service;

import java.math.BigDecimal;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.repository.ShopSettingsRepository;
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

  private final ShopSettingsRepository repository;

  public SettingsService(ShopSettingsRepository repository) {
    this.repository = repository;
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

  /** Default reorder level applied to newly created products. */
  public int defaultLowStockThreshold() {
    return get().getBusinessLogic().getLowStockThreshold();
  }
}
