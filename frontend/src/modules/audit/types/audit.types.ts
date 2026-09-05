/**
 * The audit log, as the Security settings screen lists it.
 *
 * <p>Read-only by construction: there is no write endpoint and no action in
 * this module. Entries are made by the services that perform the actions, from
 * the verified token, so nothing a browser sends can put history in the log.
 */

export type AuditAction =
  | "SALE_VOIDED"
  | "PRODUCT_WITHDRAWN"
  | "PRODUCT_RESTORED"
  | "STAFF_CREATED"
  | "STAFF_DEACTIVATED"
  | "STAFF_REACTIVATED"
  | "STAFF_ROLE_CHANGED"
  | "STAFF_PASSWORD_RESET"
  | "SETTINGS_CHANGED";

export interface AuditEntry {
  id: string;
  occurredAt: string;
  /** Denormalised on the entry, so it survives the account being removed. */
  actorName: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  /** A sentence written when it happened, readable without any lookups. */
  summary: string;
}

export interface AuditPage {
  entries: AuditEntry[];
  page: number;
  totalEntries: number;
  totalPages: number;
}
