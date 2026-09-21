package lk.ranminihardware.pos.sales.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.service.CheckoutOutcome;
import lk.ranminihardware.pos.sales.service.StockNotice;
import lk.ranminihardware.pos.sales.domain.SaleLine;
import lk.ranminihardware.pos.sales.domain.SaleStatus;
import lk.ranminihardware.pos.sales.domain.TenderMethod;
import lk.ranminihardware.pos.sales.service.CheckoutCommand;

/** Request and response shapes for the sales endpoints. */
public final class SaleDtos {

  private SaleDtos() {}

  /**
   * A checkout request.
   *
   * <p><b>Notice what is not here: money.</b> A line carries a product id and a
   * quantity, and the request carries no total. Every amount is recomputed
   * server-side from the catalogue and the shop's tax settings, because a total
   * posted by a browser is a number the customer can edit. The frontend still
   * shows a running total — a cashier needs one before pressing pay — but that
   * figure is a preview, not an instruction.
   */
  public record CheckoutRequest(
      @NotEmpty(message = "Add at least one item.")
          @Size(max = 200, message = "A single sale cannot have more than 200 lines.")
          @Valid
          List<LineRequest> lines,
      @DecimalMin(value = "0.0", message = "Discount cannot be negative.")
          @DecimalMax(value = "100.0", message = "Discount cannot exceed 100%.")
          @Digits(integer = 3, fraction = 2, message = "Enter a valid discount.")
          BigDecimal discountPercent,
      @NotNull(message = "Choose a payment method.") TenderMethod tender,
      @DecimalMin(value = "0.0", message = "Amount tendered cannot be negative.")
          @Digits(integer = 12, fraction = 2, message = "Enter a valid amount.")
          BigDecimal amountTendered,
      // No cashier fields. Who rang up a sale comes from the verified session,
      // so there is deliberately nothing here for a client to set.
      @Size(max = 60) String terminalName,
      @Size(max = 100) String idempotencyKey) {

    public CheckoutCommand toCommand() {
      return new CheckoutCommand(
          lines.stream().map(l -> new CheckoutCommand.Line(l.productId(), l.quantity())).toList(),
          discountPercent,
          tender,
          amountTendered,
          null,
          null,
          terminalName,
          idempotencyKey);
    }
  }

  public record LineRequest(
      @NotBlank(message = "Every line needs a product.") String productId,
      @Min(value = 1, message = "Quantity must be at least one.")
          @Max(value = 100_000, message = "That quantity is not plausible.")
          int quantity) {}

  /** A completed sale, as the till and the receipt printer need it. */
  public record Response(
      String id,
      String invoiceNumber,
      LocalDate businessDate,
      Instant soldAt,
      String cashierName,
      String terminalName,
      List<LineResponse> lines,
      BigDecimal subtotal,
      BigDecimal discountPercent,
      BigDecimal discountAmount,
      BigDecimal taxRate,
      BigDecimal taxAmount,
      BigDecimal total,
      TenderMethod tender,
      BigDecimal amountTendered,
      BigDecimal changeDue,
      SaleStatus status,
      String voidReason,
      /**
       * Lines this sale pushed to or below their reorder level, for the till to
       * show the cashier at once.
       *
       * <p>Always empty except on the response to a checkout. Reading a receipt
       * back describes a transaction that happened; it must not re-announce a
       * stock level from last Tuesday that has been restocked twice since.
       */
      List<StockNoticeResponse> stockNotices) {

    /** A sale being read back, which never carries stock warnings. */
    public static Response from(Sale sale) {
      return from(sale, List.of());
    }

    /** The response to a checkout, which may. */
    public static Response from(CheckoutOutcome outcome) {
      return from(
          outcome.sale(),
          outcome.notices().stream().map(StockNoticeResponse::from).toList());
    }

    private static Response from(Sale sale, List<StockNoticeResponse> stockNotices) {
      return new Response(
          sale.getId(),
          sale.getInvoiceNumber(),
          LocalDate.parse(sale.getBusinessDate()),
          sale.getSoldAt(),
          sale.getCashierName(),
          sale.getTerminalName(),
          sale.getLines().stream().map(LineResponse::from).toList(),
          sale.getSubtotal(),
          sale.getDiscountPercent(),
          sale.getDiscountAmount(),
          sale.getTaxRate(),
          sale.getTaxAmount(),
          sale.getTotal(),
          sale.getTender(),
          sale.getAmountTendered(),
          sale.getChangeDue(),
          sale.getStatus(),
          sale.getVoidReason(),
          stockNotices);
    }
  }

  /**
   * One stock warning raised by the sale just completed.
   *
   * <p>Carries the numbers rather than a finished sentence, so the till can say
   * it in the shop's own words and in the size the counter screen needs.
   */
  public record StockNoticeResponse(
      String productId,
      String sku,
      String name,
      String unit,
      int remaining,
      int reorderLevel,
      boolean soldOut) {

    static StockNoticeResponse from(StockNotice notice) {
      return new StockNoticeResponse(
          notice.productId(),
          notice.sku(),
          notice.name(),
          notice.unit(),
          notice.remaining(),
          notice.reorderLevel(),
          notice.soldOut());
    }
  }

  /**
   * One line of a receipt.
   *
   * <p>No cost and no margin. Those are recorded on the sale for reporting, but
   * a receipt is handed to a customer, so the response the till renders must not
   * be able to carry them.
   */
  public record LineResponse(
      String productId,
      String sku,
      String name,
      BigDecimal unitPrice,
      int quantity,
      BigDecimal lineTotal) {

    static LineResponse from(SaleLine line) {
      return new LineResponse(
          line.getProductId(),
          line.getSku(),
          line.getName(),
          line.getUnitPrice(),
          line.getQuantity(),
          line.getLineTotal());
    }
  }

  public record VoidRequest(
      @NotBlank(message = "Give a reason for voiding the sale.")
          @Size(max = 200, message = "Reason must be at most 200 characters.")
          String reason) {}
}
