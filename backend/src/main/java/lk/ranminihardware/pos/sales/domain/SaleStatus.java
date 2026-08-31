package lk.ranminihardware.pos.sales.domain;

/**
 * Lifecycle of a receipt.
 *
 * There is no DELETED. A voided sale stays in the collection with its stock
 * returned and a reason recorded, because the fact that a mistake was made and
 * corrected is itself part of the record an auditor needs to see.
 */
public enum SaleStatus {
  COMPLETED,
  VOIDED
}
