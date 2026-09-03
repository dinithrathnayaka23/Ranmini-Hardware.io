/**
 * The notification feed, as the bell renders it.
 *
 * <p>Nothing here is stored anywhere. The API computes every row from records
 * that already exist — the products that are low, the sales that were voided —
 * at the moment it is asked, which is why a restocked product's warning simply
 * disappears rather than needing to be retracted.
 */

/** What a notification is about. A closed set: the panel picks an icon from it. */
export type NotificationKind = "OUT_OF_STOCK" | "LOW_STOCK" | "SALE_VOIDED";

/** How much the reader should care. Drives the colour and the sort order. */
export type NotificationSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface Notification {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  occurredAt: string;
  /** Whether it happened after this person last opened the panel. */
  unread: boolean;
  /**
   * What the row is about, for the link.
   *
   * <p>The API sends a type and an id rather than a URL, deliberately: the
   * portal's route table is the frontend's business, and a path baked into an
   * API response would be a second place to update when a screen moves.
   */
  entityType: "PRODUCT" | "SALE";
  entityId: string;
}

export interface NotificationFeed {
  items: Notification[];
  /**
   * The badge on the bell.
   *
   * <p>Sent by the API as its own figure rather than counted from the rows,
   * because the panel shows a capped list while the badge must still be able to
   * say twenty — counting what is on screen would under-report the moment the
   * cap bites.
   */
  unreadCount: number;
  generatedAt: string;
}
