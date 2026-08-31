package lk.ranminihardware.pos.catalog.repository.dto;

import lk.ranminihardware.pos.catalog.domain.StockStatus;

/**
 * Filters for the product listing.
 *
 * A record rather than a long parameter list so adding a filter does not ripple
 * through every caller, and so the meaning of each argument is visible at the
 * call site.
 *
 * @param term free text matched against name, SKU and brand; null for no search
 * @param categoryId restrict to one category; null for all
 * @param status restrict to one stock state; null for all
 * @param activeOnly exclude deactivated products — always true for the till,
 *     configurable for the admin table
 */
public record ProductSearchCriteria(
    String term, String categoryId, StockStatus status, boolean activeOnly) {

  public static ProductSearchCriteria sellable(String term, String categoryId) {
    return new ProductSearchCriteria(term, categoryId, null, true);
  }

  public boolean hasTerm() {
    return term != null && !term.isBlank();
  }
}
