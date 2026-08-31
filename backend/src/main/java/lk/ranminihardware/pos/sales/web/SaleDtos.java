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
      // Supplied by the session once authentication lands; accepted from the
      // client for now so the till can be wired before that work is done.
      String cashierId,
      @Size(max = 120) String cashierName,
      @Size(max = 60) String terminalName,
      @Size(max = 100) String idempotencyKey) {

    public CheckoutCommand toCommand() {
      return new CheckoutCommand(
          lines.stream().map(l -> new CheckoutCommand.Line(l.productId(), l.quantity())).toList(),
          discountPercent,
          tender,
          amountTendered,
          cashierId,
          cashierName,
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
      String voidReason) {

    public static Response from(Sale sale) {
      return new Response(
          sale.getId(),
          sale.getInvoiceNumber(),
          sale.getBusinessDate(),
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
          sale.getVoidReason());
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
