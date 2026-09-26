package lk.ranminihardware.pos.catalog.importing;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import lk.ranminihardware.pos.audit.domain.AuditAction;
import lk.ranminihardware.pos.audit.service.AuditService;
import lk.ranminihardware.pos.catalog.importing.ProductImportService.ImportOutcome;
import lk.ranminihardware.pos.catalog.importing.ProductImportService.ImportPlan;
import lk.ranminihardware.pos.catalog.importing.ProductImportService.RowError;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.concurrent.DelegatingSecurityContextRunnable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Runs imports in the background and reports their progress.
 *
 * <p><b>Why not in the request.</b> Thirty thousand products take long enough
 * to write that a single request holding them would outlive every sensible
 * timeout between the browser and the database — and a request that times out
 * mid-import leaves the owner not knowing how much of the file went in. The
 * request instead starts a job and returns at once; the page watches the job.
 *
 * <p><b>One at a time.</b> Two imports of overlapping files would race each
 * other on the same SKUs, each checking "does this exist" before the other had
 * written it. The second is refused until the first finishes.
 *
 * <p>Jobs live in memory: a record of progress, not of data, and the products
 * themselves are in the database the moment each batch is written. Finished
 * jobs are forgotten after an hour. This assumes one backend instance, which is
 * how the shop runs; several would need the job state in the database.
 */
@Component
public class ImportJobs {

  private static final Logger log = LoggerFactory.getLogger(ImportJobs.class);
  private static final Duration KEEP_FINISHED = Duration.ofHours(1);

  private final ProductImportService imports;
  private final AuditService audit;
  private final Clock clock;

  private final Map<String, Job> jobs = new ConcurrentHashMap<>();
  private final AtomicReference<String> running = new AtomicReference<>();

  public ImportJobs(ProductImportService imports, AuditService audit, Clock clock) {
    this.imports = imports;
    this.audit = audit;
    this.clock = clock;
  }

  /**
   * Starts writing a plan in the background.
   *
   * @return the job, already running
   * @throws ApiException 409 when another import is still running
   */
  public Job start(ImportPlan plan) {
    forgetOldJobs();

    Job job =
        new Job(
            UUID.randomUUID().toString(),
            plan.rows().size(),
            plan.errorCount(),
            plan.unchanged(),
            Instant.now(clock));
    if (!running.compareAndSet(null, job.id)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "IMPORT_RUNNING",
          "Another import is still running. Wait for it to finish, then try again.");
    }
    jobs.put(job.id, job);

    // The signed-in administrator travels with the work, so the audit entry
    // names who imported rather than "system".
    Runnable work =
        DelegatingSecurityContextRunnable.create(() -> run(job, plan), SecurityContextHolder.getContext());
    Thread.ofVirtual().name("product-import-" + job.id).start(work);
    return job;
  }

  public Optional<Job> find(String id) {
    return Optional.ofNullable(jobs.get(id));
  }

  private void run(Job job, ImportPlan plan) {
    try {
      job.state = State.RUNNING;
      ImportOutcome outcome = imports.execute(plan, written -> job.processed = written);

      job.created = outcome.created();
      job.updated = outcome.updated();
      job.categoriesCreated = outcome.categoriesCreated();
      job.conflicts = outcome.conflicts();
      job.state = State.DONE;

      audit.record(
          AuditAction.PRODUCTS_IMPORTED,
          "PRODUCT",
          job.id,
          "Imported products from a spreadsheet: %d added, %d updated, %d unchanged, %d row(s) skipped%s."
              .formatted(
                  outcome.created(),
                  outcome.updated(),
                  plan.unchanged(),
                  plan.errorCount() + outcome.conflicts().size(),
                  outcome.categoriesCreated().isEmpty()
                      ? ""
                      : ", new categories " + String.join(", ", outcome.categoriesCreated())));
      log.info(
          "Import {} finished: {} created, {} updated, {} skipped",
          job.id, outcome.created(), outcome.updated(), plan.errorCount());
    } catch (RuntimeException ex) {
      job.state = State.FAILED;
      job.failure = "The import stopped partway. Products written before the problem are saved; "
          + "running the same file again will update them and add the rest.";
      log.error("Import {} failed after {} row(s)", job.id, job.processed, ex);
    } finally {
      job.finishedAt = Instant.now(clock);
      running.compareAndSet(job.id, null);
    }
  }

  private void forgetOldJobs() {
    Instant cutoff = Instant.now(clock).minus(KEEP_FINISHED);
    jobs.values().removeIf(job -> job.finishedAt != null && job.finishedAt.isBefore(cutoff));
  }

  public enum State { PENDING, RUNNING, DONE, FAILED }

  /** One import's progress. Fields are volatile: written by the job, read by requests. */
  public static final class Job {
    public final String id;
    public final int total;
    public final int skippedInPlan;
    public final long unchanged;
    public final Instant startedAt;
    volatile State state = State.PENDING;
    volatile int processed;
    volatile long created;
    volatile long updated;
    volatile List<String> categoriesCreated = List.of();
    volatile List<RowError> conflicts = List.of();
    volatile String failure;
    volatile Instant finishedAt;

    Job(String id, int total, int skippedInPlan, long unchanged, Instant startedAt) {
      this.id = id;
      this.total = total;
      this.skippedInPlan = skippedInPlan;
      this.unchanged = unchanged;
      this.startedAt = startedAt;
    }

    public State state() { return state; }
    public int processed() { return processed; }
    public long created() { return created; }
    public long updated() { return updated; }
    public List<String> categoriesCreated() { return categoriesCreated; }
    public List<RowError> conflicts() { return conflicts; }
    public String failure() { return failure; }
  }
}
