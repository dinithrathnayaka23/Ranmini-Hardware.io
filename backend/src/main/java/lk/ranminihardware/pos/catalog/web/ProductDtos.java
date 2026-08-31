package lk.ranminihardware.pos.catalog.web;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.service.ProductWrite;

/**
 * Request and response shapes for the product endpoints.
 *
 * <p>Grouped in one file because they are variations on a single subject and
 * reading them together is how you see what the API actually exposes — in
 * particular, that {@link PosProduct} has no buying price while {@link Response}
 * does.
 */
public final class ProductDtos {

  private ProductDtos() {}

  /**
   * A product as the admin inventory table sees it.
   *
   * <p>Field names match the frontend's existing {@code Product} type so the
   * table can be wired without a translation layer.
   */
  public record Response(
      String id,
      String sku,
      String name,
      String brand,
      String categoryId,
      String category,
      String unit,
      BigDecimal buyingPrice,
      BigDecimal sellingPrice,
      int stock,
      int reorderLevel,
      StockStatus status,
      String imageUrl,
      boolean active,
      Instant updatedAt) {

    public static Response from(Product p) {
      return new Response(
          p.getId(),
          p.getSku(),
          p.getName(),
          p.getBrand(),
          p.getCategoryId(),
          p.getCategoryName(),
          p.getUnit(),
          p.getBuyingPrice(),
          p.getSellingPrice(),
          p.getStock(),
          p.getReorderLevel(),
          p.getStatus(),
          p.getImageUrl(),
          p.isActive(),
          p.getUpdatedAt());
    }
  }

  /**
   * A product as the till sees it.
   *
   * <p><b>No buying price.</b> The margin on a bag of cement is not the
   * cashier's business, and the reliable way to keep it off a customer-facing
   * screen is for it never to be serialised into a response that screen can
   * read. Field names match the frontend's {@code PosProduct}.
   */
  public record PosProduct(
      String id,
      String sku,
      String name,
      String categoryId,
      BigDecimal unitPrice,
      int stock,
      StockStatus status,
      String imageUrl) {

    public static PosProduct from(Product p) {
      return new PosProduct(
          p.getId(),
          p.getSku(),
          p.getName(),
          p.getCategoryId(),
          p.getSellingPrice(),
          p.getStock(),
          p.getStatus(),
          p.getImageUrl());
    }
  }

  /**
   * Creating or updating a product.
   *
   * <p>Validated here as well as in the browser. The frontend's checks are a
   * convenience; this endpoint is reachable directly, so it is the one that
   * actually decides what gets stored.
   */
  public record Request(
      @NotBlank(message = "Enter a SKU.")
          @Size(max = 40, message = "SKU must be at most 40 characters.")
          @Pattern(
              regexp = "^[A-Za-z0-9._/-]+$",
              message = "Use letters, digits and . _ / - only.")
          String sku,
      @NotBlank(message = "Enter a product name.")
          @Size(max = 160, message = "Name must be at most 160 characters.")
          String name,
      @Size(max = 80, message = "Brand must be at most 80 characters.") String brand,
      @NotBlank(message = "Choose a category.") String categoryId,
      @Size(max = 16, message = "Unit must be at most 16 characters.") String unit,
      @NotNull(message = "Enter a buying price.")
          @DecimalMin(value = "0.0", message = "Buying price cannot be negative.")
          // Bounded so a typo cannot store a number that overflows a report.
          @Digits(integer = 10, fraction = 2, message = "Enter a valid amount.")
          BigDecimal buyingPrice,
      @NotNull(message = "Enter a selling price.")
          @DecimalMin(value = "0.0", message = "Selling price cannot be negative.")
          @Digits(integer = 10, fraction = 2, message = "Enter a valid amount.")
          BigDecimal sellingPrice,
      @Min(value = 0, message = "Opening stock cannot be negative.")
          @Max(value = 10_000_000, message = "That opening stock is not plausible.")
          int openingStock,
      @Min(value = 0, message = "Reorder level cannot be negative.")
          @Max(value = 1_000_000, message = "That reorder level is not plausible.")
          int reorderLevel,
      @Size(max = 512, message = "Image URL is too long.") String imageUrl) {

    public ProductWrite toWrite() {
      return new ProductWrite(
          sku, name, brand, categoryId, unit, buyingPrice, sellingPrice, openingStock,
          reorderLevel, imageUrl);
    }
  }

  /**
   * A deliberate stock movement.
   *
   * <p>A signed delta rather than a new absolute value, because "we took a
   * delivery of 40 bags" is what actually happened, and a delta cannot silently
   * overwrite a sale that landed between the shopkeeper reading the screen and
   * pressing save.
   */
  public record StockAdjustment(
      @NotNull(message = "Enter a quantity.")
          @Min(value = -1_000_000, message = "That adjustment is not plausible.")
          @Max(value = 1_000_000, message = "That adjustment is not plausible.")
          Integer delta,
      @NotBlank(message = "Give a reason for the adjustment.")
          @Size(max = 120, message = "Reason must be at most 120 characters.")
          String reason) {}

  /** The four figures on the inventory summary cards. */
  public record Summary(
      long totalProducts,
      long lowStockItems,
      long outOfStockItems,
      BigDecimal retailValue,
      BigDecimal costValue) {}
}
