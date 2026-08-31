package lk.ranminihardware.pos.sales.service;

import java.time.LocalDate;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lk.ranminihardware.pos.catalog.api.CatalogApi;
import lk.ranminihardware.pos.catalog.api.StockReference;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.domain.SaleLine;
import lk.ranminihardware.pos.sales.domain.SaleStatus;
import lk.ranminihardware.pos.sales.repository.SaleRepository;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Reading and voiding sales.
 *
 * Completing one lives in CheckoutService; this covers everything that happens
 * to a receipt afterwards.
 */
@Service
public class SaleService {

  private final SaleRepository sales;
  private final CatalogApi catalog;
  private final DailySummaryService dailySummary;
  private final Clock clock;

  public SaleService(
      SaleRepository sales,
      CatalogApi catalog,
      DailySummaryService dailySummary,
      Clock clock) {
    this.sales = sales;
    this.catalog = catalog;
    this.dailySummary = dailySummary;
    this.clock = clock;
  }

  public Sale get(String id) {
    return sales.findById(id).orElseThrow(() -> ApiException.notFound("Sale", id));
  }

  public Sale getByInvoiceNumber(String invoiceNumber) {
    return sales
        .findByInvoiceNumber(invoiceNumber)
        .orElseThrow(() -> ApiException.notFound("Invoice", invoiceNumber));
  }

  public Page<Sale> listBetween(LocalDate from, LocalDate to, Pageable pageable) {
    return sales.findInDateRange(from.toString(), to.toString(), pageable);
  }

  /** Shift reconciliation: every sale one cashier rang up on one day. */
  public List<Sale> forCashier(String cashierId, LocalDate businessDate) {
    return sales.findByCashierIdAndBusinessDate(cashierId, businessDate.toString());
  }

  /**
   * Voids a sale, returning its stock and backing it out of the day totals.
   *
   * The receipt is not deleted. Its status changes and a reason is recorded,
   * because the fact that a mistake was made and corrected is itself part of
   * what an auditor needs to see. Voiding twice is refused rather than treated
   * as harmless: the second call would return the stock a second time and hand
   * the shop inventory it does not have.
   */
  public Sale voidSale(String id, String reason) {
    Sale sale = get(id);

    if (sale.getStatus() == SaleStatus.VOIDED) {
      throw ApiException.conflict("ALREADY_VOIDED", "That sale has already been voided.");
    }

    StockReference reference = StockReference.forVoid(sale.getId());
    for (SaleLine line : sale.getLines()) {
      catalog.releaseStock(line.getProductId(), line.getQuantity(), reference);
    }

    sale.setStatus(SaleStatus.VOIDED);
    sale.setVoidedAt(Instant.now(clock));
    sale.setVoidReason(reason);

    Sale saved = sales.save(sale);
    dailySummary.reverse(saved);
    return saved;
  }
}
