package lk.ranminihardware.pos.notifications.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.notifications.domain.NotificationKind;
import lk.ranminihardware.pos.notifications.domain.NotificationSeverity;
import lk.ranminihardware.pos.notifications.web.NotificationDtos;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.service.SaleService;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.service.StaffService;
import org.springframework.stereotype.Service;

/**
 * The notification feed.
 *
 * <p><b>Derived, not stored.</b> There is no notifications collection and
 * nothing writes to one. Every row is computed from records that already exist —
 * the products that are low, the sales that were voided — at the moment somebody
 * asks.
 *
 * <p>That is the decision worth explaining. A stored feed means every stock
 * movement and every void also writes a notification document, and those two can
 * disagree: a product restocked an hour ago still has a low-stock notification
 * sitting in the panel until something remembers to retract it. Notifications
 * about state, generated from that state, cannot go stale — restock the cement
 * and the warning is simply gone the next time the panel opens.
 *
 * <p>The cost is that "read" cannot be a flag on a row that does not exist. It
 * is one timestamp on the staff document instead: anything that happened after
 * you last opened the panel is unread. That also buys the right behaviour for
 * free — a product falling from four units to one is a changed record, so its
 * warning counts as unread again, which is precisely when the owner wants to see
 * it a second time.
 *
 * <p>This module composes other modules' services rather than querying their
 * collections, the same way the dashboard does. A notification panel running its
 * own aggregations is how two screens end up disagreeing about how many products
 * are out of stock.
 */
@Service
public class NotificationService {

  /**
   * How many stock alerts the panel carries.
   *
   * <p>A shop with sixty low lines has an ordering problem rather than a
   * notification problem: the panel shows the most urgent handful, and the
   * inventory screen — which can filter, sort and page — is one click away.
   */
  private static final int STOCK_ALERT_LIMIT = 12;

  /**
   * How many stock alerts the <em>till</em> carries.
   *
   * <p>Smaller than the portal's on purpose. The owner is working through a
   * list; the cashier is glancing at one between customers, and a panel they
   * have to scroll is a panel they will not read. The most urgent handful is
   * the whole of what is useful at a counter.
   */
  private static final int TILL_ALERT_LIMIT = 8;

  /** How many recent voids to show, and how far back to look for them. */
  private static final int VOID_LIMIT = 6;

  private static final Duration VOID_WINDOW = Duration.ofDays(7);

  /** Open password-help requests to show. More than this at once is not a real shop. */
  private static final int PASSWORD_HELP_LIMIT = 10;

  private final ProductService products;
  private final SaleService sales;
  private final StaffService staff;
  private final Clock clock;

  public NotificationService(
      ProductService products, SaleService sales, StaffService staff, Clock clock) {
    this.products = products;
    this.sales = sales;
    this.staff = staff;
    this.clock = clock;
  }

  /**
   * Builds the feed as it stands right now.
   *
   * @param readAt when this person last opened the panel, or null if never
   */
  public NotificationDtos.Feed feedFor(Instant readAt) {
    Instant now = Instant.now(clock);

    List<NotificationDtos.Item> items = new ArrayList<>();
    items.addAll(stockAlerts(readAt));
    items.addAll(voidedSales(now.minus(VOID_WINDOW), readAt));
    items.addAll(passwordHelpRequests(readAt));

    // Severity first, then most recent. Time alone would bury an empty shelf
    // under a week of routine corrections; severity alone would leave two
    // equally urgent lines in whatever order they happened to arrive.
    items.sort(
        Comparator.comparingInt(
                (NotificationDtos.Item item) -> item.severity().ordinal())
            .thenComparing(NotificationDtos.Item::occurredAt, Comparator.reverseOrder()));

    int unread = (int) items.stream().filter(NotificationDtos.Item::unread).count();
    return new NotificationDtos.Feed(List.copyOf(items), unread, now);
  }

  /**
   * The feed as the till needs it: stock, and nothing else.
   *
   * <p><b>What is left out is the point of this method.</b> The portal's feed
   * also carries voided sales, and a shop that shows a cashier every void is a
   * shop where a cashier reads their own corrections back as an accusation —
   * that row exists for the owner's oversight of the counter, which makes it
   * exactly the wrong thing to put on the counter's own screen. Takings,
   * staffing and settings changes are equally none of the till's business.
   *
   * <p>What is left is the two things a cashier can genuinely act on: a product
   * that has run out, so they stop promising it, and a product at or below its
   * reorder level, so they can tell the owner while it still matters. Both are
   * about the shelf in front of them.
   *
   * @param readAt when this cashier last opened the panel, or null if never
   */
  public NotificationDtos.Feed tillFeedFor(Instant readAt) {
    Instant now = Instant.now(clock);

    List<NotificationDtos.Item> items = new ArrayList<>(stockAlerts(readAt, TILL_ALERT_LIMIT));

    // Empty shelves first, then whatever is closest to being one. A cashier
    // reading only the top row should be reading the most urgent one.
    items.sort(
        Comparator.comparingInt(
                (NotificationDtos.Item item) -> item.severity().ordinal())
            .thenComparing(NotificationDtos.Item::occurredAt, Comparator.reverseOrder()));

    int unread = (int) items.stream().filter(NotificationDtos.Item::unread).count();
    return new NotificationDtos.Feed(List.copyOf(items), unread, now);
  }

  /** The till's feed with every row already marked read. See {@link #feedAllRead()}. */
  public NotificationDtos.Feed tillFeedAllRead() {
    return allRead(tillFeedFor(null));
  }

  /**
   * The feed as it stands, with every row already marked read.
   *
   * <p>Built in one pass rather than by re-reading the feed after stamping the
   * marker: the two reads could differ, and the panel would flash a row that the
   * write had just declared seen. The stamp the caller should store is this
   * feed's own {@code generatedAt}, so the marker can never run ahead of what was
   * actually shown.
   */
  public NotificationDtos.Feed feedAllRead() {
    return allRead(feedFor(null));
  }

  /** Stamps every row of a freshly built feed as seen, in one pass. */
  private static NotificationDtos.Feed allRead(NotificationDtos.Feed feed) {
    List<NotificationDtos.Item> read =
        feed.items().stream()
            .map(
                item ->
                    new NotificationDtos.Item(
                        item.id(),
                        item.kind(),
                        item.severity(),
                        item.title(),
                        item.detail(),
                        item.occurredAt(),
                        false,
                        item.entityType(),
                        item.entityId()))
            .toList();

    return new NotificationDtos.Feed(read, 0, feed.generatedAt());
  }

  /**
   * Out-of-stock and low-stock lines.
   *
   * <p>Both come from one query — the same one the dashboard's low-stock panel
   * uses — and are split by status here, because they are the same fact at two
   * levels of urgency: an empty shelf loses sales today, a low one next week.
   */
  private List<NotificationDtos.Item> stockAlerts(Instant readAt) {
    return stockAlerts(readAt, STOCK_ALERT_LIMIT);
  }

  private List<NotificationDtos.Item> stockAlerts(Instant readAt, int limit) {
    return products.lowStock(limit).stream()
        .map(product -> stockAlert(product, readAt))
        .toList();
  }

  private NotificationDtos.Item stockAlert(Product product, Instant readAt) {
    boolean empty = product.getStock() <= 0;
    String unit = product.getUnit() == null ? "units" : product.getUnit();

    // The product's own modification time, which moves with every sale and every
    // adjustment. Stamping "now" instead would make every alert permanently
    // unread; using the creation date would never mark one unread again after
    // the stock fell further.
    Instant occurredAt = product.getUpdatedAt() == null ? Instant.EPOCH : product.getUpdatedAt();

    return new NotificationDtos.Item(
        // The stock level is part of the id, so a product that falls further
        // reads as a new row rather than as one the client may already have
        // shown and dismissed.
        "stock:%s:%d".formatted(product.getId(), product.getStock()),
        empty ? NotificationKind.OUT_OF_STOCK : NotificationKind.LOW_STOCK,
        empty ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING,
        empty
            ? "%s is out of stock".formatted(product.getName())
            : "%s is running low".formatted(product.getName()),
        empty
            ? "%s has nothing on the shelf. Reorder level is %d %s."
                .formatted(product.getSku(), product.getReorderLevel(), unit)
            : "%s has %d %s left, at or below its reorder level of %d."
                .formatted(product.getSku(), product.getStock(), unit, product.getReorderLevel()),
        occurredAt,
        isUnread(occurredAt, readAt),
        "PRODUCT",
        product.getId());
  }

  /** Sales cancelled in the last week — the owner's window on the till. */
  private List<NotificationDtos.Item> voidedSales(Instant since, Instant readAt) {
    return sales.recentlyVoided(since, VOID_LIMIT).stream()
        .map(sale -> voidedSale(sale, readAt))
        .toList();
  }

  private NotificationDtos.Item voidedSale(Sale sale, Instant readAt) {
    Instant occurredAt = sale.getVoidedAt() == null ? sale.getSoldAt() : sale.getVoidedAt();
    String cashier = sale.getCashierName() == null ? "a cashier" : sale.getCashierName();
    String reason =
        sale.getVoidReason() == null || sale.getVoidReason().isBlank()
            ? "No reason was recorded."
            : sale.getVoidReason();

    return new NotificationDtos.Item(
        "void:%s".formatted(sale.getId()),
        NotificationKind.SALE_VOIDED,
        NotificationSeverity.INFO,
        "Sale %s was voided".formatted(sale.getInvoiceNumber()),
        "Rung up by %s. %s".formatted(cashier, reason),
        occurredAt,
        isUnread(occurredAt, readAt),
        "SALE",
        sale.getId());
  }

  /** Never having opened the panel means everything in it is new. */
  /**
   * People locked out of their account and waiting on the owner.
   *
   * <p>A warning rather than information: somebody cannot work until it is
   * dealt with. Deliberately absent from the till's feed — it is the owner's
   * job to answer, and the cashier who asked already knows.
   */
  private List<NotificationDtos.Item> passwordHelpRequests(Instant readAt) {
    return staff.pendingPasswordHelp(PASSWORD_HELP_LIMIT).stream()
        .map(member -> passwordHelp(member, readAt))
        .toList();
  }

  private NotificationDtos.Item passwordHelp(StaffMember member, Instant readAt) {
    Instant occurredAt = member.getPasswordHelpRequestedAt();
    return new NotificationDtos.Item(
        "password-help:%s:%d".formatted(member.getId(), occurredAt.toEpochMilli()),
        NotificationKind.PASSWORD_HELP,
        NotificationSeverity.WARNING,
        "%s needs a new password".formatted(member.getFullName()),
        ("%s asked for a reset from the sign-in page. Set a temporary password from Staff;"
                + " they will choose their own when they next sign in.")
            .formatted(member.getUsername()),
        occurredAt,
        isUnread(occurredAt, readAt),
        "STAFF",
        member.getId());
  }

  private static boolean isUnread(Instant occurredAt, Instant readAt) {
    return readAt == null || occurredAt.isAfter(readAt);
  }
}
