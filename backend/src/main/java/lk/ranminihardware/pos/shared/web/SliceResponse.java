package lk.ranminihardware.pos.shared.web;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Slice;

/**
 * One page of results and whether another follows, with no total.
 *
 * <p>For lists that are scrolled rather than paged through by number, where a
 * total would be computed on every request and never shown. See {@link
 * PageResponse} for the numbered kind.
 */
public record SliceResponse<T>(List<T> content, int page, int pageSize, boolean hasNext) {

  public static <S, T> SliceResponse<T> from(Slice<S> slice, Function<S, T> mapper) {
    return new SliceResponse<>(
        slice.getContent().stream().map(mapper).toList(),
        slice.getNumber() + 1,
        slice.getSize(),
        slice.hasNext());
  }
}
