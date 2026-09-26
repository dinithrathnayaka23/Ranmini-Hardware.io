package lk.ranminihardware.pos.catalog.web;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lk.ranminihardware.pos.catalog.importing.ImportJobs;
import lk.ranminihardware.pos.catalog.importing.ImportJobs.Job;
import lk.ranminihardware.pos.catalog.importing.ProductImportService;
import lk.ranminihardware.pos.catalog.importing.ProductImportService.ImportPlan;
import lk.ranminihardware.pos.catalog.importing.ProductImportService.RowError;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Bulk product import from a spreadsheet saved as CSV. Administrators only —
 * everything under {@code /api/v1/inventory} is.
 *
 * <p>The file is sent as the raw request body ({@code text/csv}), not as a
 * multipart upload. That keeps it clear of the multipart size limit, which is
 * sized for photographs, and lets this controller apply its own: {@link
 * #MAX_BYTES}, counted as the body is read, so an oversized upload is refused
 * without ever being held in memory in full.
 *
 * <ol>
 *   <li>{@code POST /import/preview} — checks the file and reports what would
 *       happen. Writes nothing.</li>
 *   <li>{@code POST /import} — checks it again (the catalogue may have changed
 *       since the preview) and starts writing it in the background.</li>
 *   <li>{@code GET /import/{id}} — the job's progress, polled by the page.</li>
 * </ol>
 */
@RestController
@RequestMapping("/api/v1/inventory/import")
public class ProductImportController {

  /** Twelve megabytes: about fifty thousand typical product rows. */
  static final int MAX_BYTES = 12 * 1024 * 1024;

  private final ProductImportService imports;
  private final ImportJobs jobs;

  public ProductImportController(ProductImportService imports, ImportJobs jobs) {
    this.imports = imports;
    this.jobs = jobs;
  }

  @PostMapping(value = "/preview", consumes = {"text/csv", "text/plain", "application/octet-stream"})
  public PreviewResponse preview(HttpServletRequest request) {
    return PreviewResponse.from(plan(request));
  }

  @PostMapping(consumes = {"text/csv", "text/plain", "application/octet-stream"})
  public ResponseEntity<JobResponse> start(HttpServletRequest request) {
    ImportPlan plan = plan(request);
    if (plan.rows().isEmpty()) {
      throw ApiException.badRequest("NOTHING_TO_IMPORT", "No row in the file can be imported.");
    }
    return ResponseEntity.status(HttpStatus.ACCEPTED).body(JobResponse.from(jobs.start(plan)));
  }

  @GetMapping("/{id}")
  public ResponseEntity<JobResponse> status(@PathVariable String id) {
    return jobs.find(id)
        .map(job -> ResponseEntity.ok().header("Cache-Control", "no-store").body(JobResponse.from(job)))
        .orElseThrow(() -> ApiException.notFound("Import", id));
  }

  private ImportPlan plan(HttpServletRequest request) {
    if (request.getContentLengthLong() > MAX_BYTES) throw tooLarge();
    try (Reader reader =
        new InputStreamReader(new LimitedInputStream(request.getInputStream(), MAX_BYTES), StandardCharsets.UTF_8)) {
      return imports.plan(reader);
    } catch (IOException ex) {
      throw ApiException.badRequest("UNREADABLE_FILE", "The file could not be read.");
    }
  }

  private static ApiException tooLarge() {
    return new ApiException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        "FILE_TOO_LARGE",
        "The file is larger than 12 MB. Split it into smaller files and import them one at a time.");
  }

  /**
   * Stops reading once the limit is passed, whatever the request claimed its
   * length was — a body sent in chunks has no declared length to check.
   */
  private static final class LimitedInputStream extends java.io.FilterInputStream {
    private final long limit;
    private long read;

    LimitedInputStream(InputStream in, long limit) {
      super(in);
      this.limit = limit;
    }

    @Override
    public int read() throws IOException {
      int b = super.read();
      if (b != -1) count(1);
      return b;
    }

    @Override
    public int read(byte[] buffer, int offset, int length) throws IOException {
      int n = super.read(buffer, offset, length);
      if (n > 0) count(n);
      return n;
    }

    private void count(int n) {
      read += n;
      if (read > limit) throw tooLarge();
    }
  }

  /** What an import would do. */
  public record PreviewResponse(
      int rows,
      long toCreate,
      long toUpdate,
      long unchanged,
      int skipped,
      List<String> newCategories,
      List<RowError> errors) {

    static PreviewResponse from(ImportPlan plan) {
      return new PreviewResponse(
          plan.rows().size(),
          plan.toCreate(),
          plan.toUpdate(),
          plan.unchanged(),
          plan.errorCount(),
          List.copyOf(plan.newCategories().values()),
          plan.errors());
    }
  }

  /** An import's progress, and its result once finished. */
  public record JobResponse(
      String id,
      String state,
      int total,
      int processed,
      long created,
      long updated,
      long unchanged,
      int skipped,
      List<String> categoriesCreated,
      List<RowError> conflicts,
      String failure) {

    static JobResponse from(Job job) {
      return new JobResponse(
          job.id,
          job.state().name(),
          job.total,
          job.processed(),
          job.created(),
          job.updated(),
          job.unchanged,
          job.skippedInPlan + job.conflicts().size(),
          job.categoriesCreated(),
          job.conflicts(),
          job.failure());
    }
  }
}
