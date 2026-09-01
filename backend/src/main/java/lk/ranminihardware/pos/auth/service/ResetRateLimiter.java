package lk.ranminihardware.pos.auth.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Throttles password-reset requests.
 *
 * <p>Without this, one open endpoint will happily mail somebody a thousand
 * messages, which is both a way to harass a member of staff and a fast route to
 * having the shop's sending domain blacklisted.
 *
 * <p><b>In-memory, and that is a considered limit.</b> A shop running one
 * instance gets exactly the protection it needs; a second instance would let
 * twice the traffic through, and a restart clears the counters. Both are
 * acceptable here because this is a rate limit rather than an authorization
 * check — nothing is unlocked by getting past it, only re-sent. Moving to a
 * shared store is the change to make if the deployment ever grows a second
 * node.
 */
@Component
public class ResetRateLimiter {

  /**
   * Ceiling on how many distinct keys are tracked.
   *
   * <p>A map keyed by attacker-supplied text is a memory-exhaustion target. Once
   * the map is full it is cleared wholesale rather than being allowed to grow:
   * losing the counters briefly is a far smaller problem than running the JVM
   * out of heap.
   */
  private static final int MAX_TRACKED_KEYS = 10_000;

  private final Map<String, Window> windows = new ConcurrentHashMap<>();
  private final Clock clock;
  private final int maxAttempts;
  private final Duration window;

  public ResetRateLimiter(
      Clock clock,
      @Value("${ranmini.auth.reset-rate-limit.attempts:5}") int maxAttempts,
      @Value("${ranmini.auth.reset-rate-limit.window-minutes:15}") long windowMinutes) {
    this.clock = clock;
    this.maxAttempts = maxAttempts;
    this.window = Duration.ofMinutes(windowMinutes);
  }

  /**
   * Records an attempt against {@code key} and says whether it is allowed.
   *
   * @param key whatever the caller wants counted — an email address, a client
   *     address. Callers should check every key they have, so that neither
   *     rotating the address nor rotating the target defeats the limit.
   */
  public boolean allow(String key) {
    if (key == null || key.isBlank()) return true;

    Instant now = Instant.now(clock);

    if (windows.size() > MAX_TRACKED_KEYS) windows.clear();

    Window current =
        windows.compute(
            key,
            (ignored, existing) ->
                existing == null || existing.startedAt.plus(window).isBefore(now)
                    ? new Window(now)
                    : existing);

    return current.count.incrementAndGet() <= maxAttempts;
  }

  /** One counting period for one key. */
  private static final class Window {
    private final Instant startedAt;
    private final AtomicInteger count = new AtomicInteger();

    private Window(Instant startedAt) {
      this.startedAt = startedAt;
    }
  }
}
