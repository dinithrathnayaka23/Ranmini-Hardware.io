package lk.ranminihardware.pos.shared.web;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/**
 * The paging envelope every list endpoint returns.
 *
 * Spring's own {@code Page} serialises to an unstable shape that leaks its
 * internal {@code Pageable} into the JSON, so the API publishes this instead.
 * The field names match the frontend's existing {@code InventoryPageMeta}, so
 * wiring a table to a live endpoint needs no translation layer.
 *
 * <p>Note that {@code page} is 1-based here while Spring is 0-based. Humans
 * count pages from one, and the page number appears in the URL a shopkeeper may
 * bookmark; the conversion happens once, in {@link PageQuery}.
 */
public record PageResponse<T>(
    List<T> content, int page, int pageSize, long totalEntries, int totalPages, boolean hasNext) {

  public static <T> PageResponse<T> from(Page<T> page) {
    return new PageResponse<>(
        page.getContent(),
        page.getNumber() + 1,
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages(),
        page.hasNext());
  }

  /** Maps the rows while keeping the paging metadata intact. */
  public static <S, T> PageResponse<T> from(Page<S> page, Function<S, T> mapper) {
    return new PageResponse<>(
        page.getContent().stream().map(mapper).toList(),
        page.getNumber() + 1,
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages(),
        page.hasNext());
  }

  public static <T> PageResponse<T> of(
      List<T> content, int page, int pageSize, long totalEntries) {
    int totalPages = pageSize == 0 ? 0 : (int) Math.ceil((double) totalEntries / pageSize);
    return new PageResponse<>(
        content, page, pageSize, totalEntries, totalPages, page < totalPages);
  }
}
