package lk.ranminihardware.pos.sales.web;

import jakarta.validation.Valid;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Set;
import lk.ranminihardware.pos.auth.service.JwtService.AuthenticatedUser;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.service.CheckoutService;
import lk.ranminihardware.pos.sales.service.SaleService;
import lk.ranminihardware.pos.shared.web.PageQuery;
import lk.ranminihardware.pos.shared.web.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sales — completing them, reading them, and voiding them.
 *
 * <p>Checkout is mounted under {@code /api/v1/pos} because it is the till's
 * endpoint; the read and void operations sit under {@code /api/v1/sales} because
 * they belong to the back office.
 */
@RestController
public class SaleController {

  private static final Set<String> SORTABLE = Set.of("soldAt", "total");
  private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "soldAt");

  /**
   * How far back an unbounded sales listing may reach by default.
   *
   * <p>Without a default window, opening the sales screen on a shop with three
   * years of history asks for every sale ever made. Thirty days is what somebody
   * actually wants to see; anything older is a deliberate date-range query.
   */
  private static final int DEFAULT_WINDOW_DAYS = 30;

  private final CheckoutService checkout;
  private final SaleService sales;
  private final PageQuery pageQuery;
  private final Clock clock;

  public SaleController(
      CheckoutService checkout, SaleService sales, PageQuery pageQuery, Clock clock) {
    this.checkout = checkout;
    this.sales = sales;
    this.pageQuery = pageQuery;
    this.clock = clock;
  }

  /**
   * Completes a sale.
   *
   * <p><b>The cashier is taken from the verified token, never from the request
   * body.</b> Whatever the client sends for the cashier is discarded: a till
   * that could name somebody else on a receipt would make the sales ledger
   * useless for exactly the question it exists to answer — who rang this up.
   *
   * <p>The idempotency key may also arrive as a header, which is the convention
   * an HTTP client library already follows on a retry. The body wins if both are
   * present, since that is the one the till explicitly set.
   */
  @PostMapping("/api/v1/pos/sales")
  @ResponseStatus(HttpStatus.CREATED)
  public SaleDtos.Response checkout(
      @Valid @RequestBody SaleDtos.CheckoutRequest request,
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
      Authentication authentication) {

    var command = request.toCommand();
    if (command.idempotencyKey() == null && idempotencyHeader != null) {
      command = command.withIdempotencyKey(idempotencyHeader);
    }

    if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
      command = command.withCashier(user.id(), user.fullName());
    }

    return SaleDtos.Response.from(checkout.checkout(command));
  }

  @GetMapping("/api/v1/sales/{id}")
  public SaleDtos.Response get(@PathVariable String id) {
    return SaleDtos.Response.from(sales.get(id));
  }

  /** Receipt reprint by the number printed on the customer's copy. */
  @GetMapping("/api/v1/sales/by-invoice/{invoiceNumber}")
  public SaleDtos.Response byInvoice(@PathVariable String invoiceNumber) {
    return SaleDtos.Response.from(sales.getByInvoiceNumber(invoiceNumber));
  }

  @GetMapping("/api/v1/sales")
  public PageResponse<SaleDtos.Response> list(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size,
      @RequestParam(required = false) String sort) {

    LocalDate today = LocalDate.now(clock);
    LocalDate end = to == null ? today : to;
    LocalDate start = from == null ? end.minusDays(DEFAULT_WINDOW_DAYS) : from;

    Pageable pageable = pageQuery.build(page, size, sort, SORTABLE, DEFAULT_SORT);
    Page<Sale> results = sales.listBetween(start, end, pageable);

    return PageResponse.from(results, SaleDtos.Response::from);
  }

  /**
   * Voids a sale and returns its stock.
   *
   * <p>POST rather than DELETE: nothing is removed, and the reason is part of
   * the record.
   */
  @PostMapping("/api/v1/sales/{id}/void")
  public SaleDtos.Response voidSale(
      @PathVariable String id, @Valid @RequestBody SaleDtos.VoidRequest request) {
    return SaleDtos.Response.from(sales.voidSale(id, request.reason()));
  }
}
