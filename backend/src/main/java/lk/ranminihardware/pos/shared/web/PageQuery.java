package lk.ranminihardware.pos.shared.web;

import java.util.Set;
import lk.ranminihardware.pos.shared.config.ApiProperties;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/**
 * Builds a safe {@link Pageable} from raw query parameters.
 *
 * Every list endpoint goes through here rather than binding a {@code Pageable}
 * directly, for three reasons that all matter once the collections are large:
 *
 * <ul>
 *   <li><b>The page size is capped.</b> An uncapped {@code ?size=1000000} turns
 *       a paged endpoint into a full collection scan that can exhaust the
 *       service's heap on a single request.
 *   <li><b>Sort fields are whitelisted.</b> Sorting on an unindexed field makes
 *       Mongo pull the whole result set into memory to sort it, and past 32MB it
 *       simply fails. Allowing an arbitrary {@code ?sort=} is handing a caller a
 *       way to do that at will.
 *   <li><b>Deep offsets are refused.</b> {@code skip} makes the server walk
 *       every skipped document, so page 40,000 of a large collection is slow no
 *       matter how good the index is. Past the limit, callers are told to narrow
 *       their filter instead of being quietly served a request that will time
 *       out.
 * </ul>
 */
@Component
public class PageQuery {

  /**
   * Beyond this offset, paging stops being cheap regardless of indexing. A
   * human browsing a table never reaches it; an export loop does, and should be
   * using a filter or a cursor instead.
   */
  private static final int MAX_OFFSET = 50_000;

  private final ApiProperties properties;

  public PageQuery(ApiProperties properties) {
    this.properties = properties;
  }

  /**
   * @param page 1-based page number as supplied by the client
   * @param size requested rows per page, or null for the configured default
   * @param sort requested sort expression, e.g. "name,asc"
   * @param sortable field names this endpoint has an index for
   * @param defaultSort applied when the client asks for nothing
   */
  public Pageable build(
      Integer page, Integer size, String sort, Set<String> sortable, Sort defaultSort) {

    int pageNumber = (page == null || page < 1) ? 1 : page;
    int pageSize = size == null ? properties.defaultPageSize() : size;

    if (pageSize < 1) pageSize = properties.defaultPageSize();
    if (pageSize > properties.maxPageSize()) pageSize = properties.maxPageSize();

    long offset = (long) (pageNumber - 1) * pageSize;
    if (offset > MAX_OFFSET) {
      throw ApiException.badRequest(
          "PAGE_TOO_DEEP",
          "That page is too far into the results. Narrow the search and try again.");
    }

    return PageRequest.of(pageNumber - 1, pageSize, parseSort(sort, sortable, defaultSort));
  }

  private Sort parseSort(String sort, Set<String> sortable, Sort defaultSort) {
    if (sort == null || sort.isBlank()) return defaultSort;

    String[] parts = sort.split(",", 2);
    String field = parts[0].trim();

    // An unknown field falls back to the default rather than erroring: a stale
    // bookmark should still render the table, just not in the order it asked
    // for. An unindexed sort, by contrast, is never silently honoured.
    if (!sortable.contains(field)) return defaultSort;

    boolean descending = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
    return Sort.by(descending ? Sort.Direction.DESC : Sort.Direction.ASC, field);
  }
}
