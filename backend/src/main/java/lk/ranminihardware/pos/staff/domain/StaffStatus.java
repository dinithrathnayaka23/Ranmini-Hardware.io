package lk.ranminihardware.pos.staff.domain;

/**
 * Whether an account may be used.
 *
 * There is no DELETED. A cashier who leaves is set INACTIVE, because every sale
 * they ever rang up names them, and a receipt whose cashier cannot be
 * identified is exactly the gap an audit is looking for.
 */
public enum StaffStatus {
  ACTIVE,
  INACTIVE
}
