package lk.ranminihardware.pos.catalog.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.locks.ReentrantLock;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import org.springframework.stereotype.Component;

/**
 * The catalogue totals — product count, low and out of stock, stock value —
 * computed at most once every few seconds.
 *
 * <p>They are a sum over every active product, so they cost a read of the whole
 * catalogue: about 200ms at thirty thousand lines. The dashboard and the
 * inventory screen both show them, and both are opened constantly, so without
 * this the busiest screens in the portal would each pay that on every view.
 *
 * <p><b>How fresh.</b> An administrator's own changes — adding, editing,
 * withdrawing or restocking a product — clear it immediately, so the person who
 * made a change always sees it reflected. Sales at the till do not, on purpose:
 * a sale moves the stock value by the price of a few items, and recounting the
 * whole catalogue for every sale on a busy afternoon would put the cost straight
 * back. Those show up within {@link #TTL}.
 *
 * <p><b>One recount at a time.</b> When it expires, the first request recounts
 * and the rest wait for that answer rather than all starting their own — ten
 * people opening the dashboard at nine o'clock cost one recount, not ten. A lock
 * rather than {@code synchronized}, which would pin the virtual thread the
 * request runs on while it waits on the database.
 */
@Component
public class InventorySummaryCache {

  static final Duration TTL = Duration.ofSeconds(20);

  private final ProductRepository products;
  private final Clock clock;
  private final ReentrantLock recount = new ReentrantLock();

  private volatile Snapshot snapshot;

  public InventorySummaryCache(ProductRepository products, Clock clock) {
    this.products = products;
    this.clock = clock;
  }

  public InventorySummary get() {
    Snapshot current = snapshot;
    if (isFresh(current)) return current.summary();

    recount.lock();
    try {
      // Another request may have recounted while this one waited for the lock.
      current = snapshot;
      if (isFresh(current)) return current.summary();

      InventorySummary summary = products.summarise();
      snapshot = new Snapshot(summary, Instant.now(clock));
      return summary;
    } finally {
      recount.unlock();
    }
  }

  /** Forgets the totals, so the next request recounts. Call after any admin change. */
  public void invalidate() {
    snapshot = null;
  }

  private boolean isFresh(Snapshot snapshot) {
    return snapshot != null && snapshot.takenAt().plus(TTL).isAfter(Instant.now(clock));
  }

  private record Snapshot(InventorySummary summary, Instant takenAt) {}
}
