package lk.ranminihardware.pos.staff.domain;

/**
 * What a staff member is allowed to be.
 *
 * The values match the frontend staffRoles list exactly, so a role chosen in
 * the UI is stored verbatim rather than translated. Authorisation rules are not
 * attached yet: the roles are recorded now so that when the authentication
 * phase lands, it maps existing records rather than inventing them.
 */
public enum StaffRole {
  CASHIER,
  STOREKEEPER,
  MANAGER,
  ADMINISTRATOR
}
