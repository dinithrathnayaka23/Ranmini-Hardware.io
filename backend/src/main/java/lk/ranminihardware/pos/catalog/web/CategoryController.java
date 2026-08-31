package lk.ranminihardware.pos.catalog.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Product categories — the filter chips above the till's grid, and the grouping
 * used throughout inventory and reporting.
 */
@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

  private final CategoryService categories;

  public CategoryController(CategoryService categories) {
    this.categories = categories;
  }

  /**
   * The active category list.
   *
   * <p>Not paged: this is a short, bounded list that every screen needs in full,
   * and paging it would mean the till could not render its filter row from one
   * request.
   */
  @GetMapping
  public List<Response> list() {
    return categories.listActive().stream().map(Response::from).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Response create(@Valid @RequestBody CreateRequest request) {
    return Response.from(categories.create(request.name(), request.displayOrder()));
  }

  @PatchMapping("/{id}")
  public Response rename(@PathVariable String id, @Valid @RequestBody RenameRequest request) {
    return Response.from(categories.rename(id, request.name()));
  }

  @PatchMapping("/{id}/order")
  public Response reorder(@PathVariable String id, @Valid @RequestBody ReorderRequest request) {
    return Response.from(categories.reorder(id, request.displayOrder()));
  }

  /**
   * Deactivates the category. Its products stay sellable — pulling a whole
   * shelf off the till because someone tidied the category list would be a far
   * worse surprise than an unfiled product.
   */
  @DeleteMapping("/{id}")
  public Response deactivate(@PathVariable String id) {
    return Response.from(categories.deactivate(id));
  }

  /** Field names match the frontend's {@code PosCategory}. */
  public record Response(String id, String label, String slug, int displayOrder) {
    static Response from(Category c) {
      return new Response(c.getId(), c.getName(), c.getSlug(), c.getDisplayOrder());
    }
  }

  public record CreateRequest(
      @NotBlank(message = "Enter a category name.")
          @Size(max = 80, message = "Name must be at most 80 characters.")
          String name,
      Integer displayOrder) {}

  public record RenameRequest(
      @NotBlank(message = "Enter a category name.")
          @Size(max = 80, message = "Name must be at most 80 characters.")
          String name) {}

  public record ReorderRequest(int displayOrder) {}
}
