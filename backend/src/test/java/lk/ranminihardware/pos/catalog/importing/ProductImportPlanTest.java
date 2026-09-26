package lk.ranminihardware.pos.catalog.importing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.StringReader;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.importing.ProductImportService.ImportPlan;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.repository.dto.ProductDetails;
import lk.ranminihardware.pos.catalog.service.CategoryService;
import lk.ranminihardware.pos.catalog.service.InventorySummaryCache;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Checking a spreadsheet before anything is written.
 *
 * <p>The preview is what the owner decides on, so it has to say exactly what
 * will happen: which rows are new, which update an existing product, which
 * categories will be created, and which rows are wrong and why.
 */
class ProductImportPlanTest {

  private static final String HEADING =
      "SKU,Name,Brand,Category,Unit,Buying Price,Selling Price,Stock,Reorder Level\n";

  /** HT-001 as stored: the file below renames it, so it is an update. */
  private static final ProductDetails STORED_HAMMER =
      new ProductDetails("Old Name", null, "c1", "pcs", BigDecimal.ONE, BigDecimal.TEN, 0);

  private final ProductRepository products = mock(ProductRepository.class);
  private final CategoryService categories = mock(CategoryService.class);
  private ProductImportService service;

  @BeforeEach
  void setUp() {
    when(categories.listAll())
        .thenReturn(
            List.of(Category.builder().id("c1").name("Hand Tools").slug("hand-tools").build()));
    when(products.detailsBySku(anyCollection()))
        .thenAnswer(
            call ->
                ((Collection<?>) call.getArgument(0)).contains("HT-001")
                    ? Map.of("HT-001", STORED_HAMMER)
                    : Map.of());
    service =
        new ProductImportService(
            products, categories, mock(InventorySummaryCache.class), Clock.systemUTC());
  }

  @Test
  @DisplayName("new and existing SKUs are told apart, whatever case they are typed in")
  void createsAndUpdates() {
    ImportPlan plan =
        plan(
            HEADING
                + "ht-001,Claw Hammer,Stanley,Hand Tools,pcs,900,1250,10,2\n"
                + "HT-002,Hand Saw,,hand tools,,1500,2100,,\n");

    assertThat(plan.toUpdate()).isEqualTo(1);
    assertThat(plan.toCreate()).isEqualTo(1);
    assertThat(plan.errorCount()).isZero();
    assertThat(plan.rows().get(0).sku()).isEqualTo("HT-001");
    assertThat(plan.rows().get(1).unit()).isEqualTo("pcs");
  }

  @Test
  @DisplayName("a row identical to the stored product is unchanged, and will not be written")
  void identicalRowsAreUnchanged() {
    ImportPlan plan = plan(HEADING + "HT-001,Old Name,,Hand Tools,pcs,1,10,,0\n");

    assertThat(plan.unchanged()).isEqualTo(1);
    assertThat(plan.toUpdate()).isZero();
    assertThat(plan.toCreate()).isZero();
  }

  @Test
  @DisplayName("an unknown category is listed once, however many rows use it")
  void newCategories() {
    ImportPlan plan =
        plan(HEADING + "PL-1,Elbow,,Plumbing,,10,20,,\n" + "PL-2,Tee,,plumbing ,,10,20,,\n");

    assertThat(plan.newCategories()).containsOnlyKeys("plumbing");
  }

  @Test
  @DisplayName("prices are read the way spreadsheets write them")
  void spreadsheetPrices() {
    ImportPlan plan = plan(HEADING + "X-1,Drill,,Hand Tools,,\"1,250.50\",Rs. 1500,,\n");

    assertThat(plan.rows().get(0).buyingPrice()).isEqualByComparingTo(new BigDecimal("1250.50"));
    assertThat(plan.rows().get(0).sellingPrice()).isEqualByComparingTo(new BigDecimal("1500"));
  }

  @Test
  @DisplayName("bad rows are skipped with their line number and reason; good rows still count")
  void badRowsAreReported() {
    ImportPlan plan =
        plan(
            HEADING
                + "OK-1,Good,,Hand Tools,,10,20,,\n"
                + "bad sku!,Name,,Hand Tools,,10,20,,\n"
                + "OK-2,,,Hand Tools,,10,20,,\n"
                + "OK-3,Name,,Hand Tools,,ten,20,,\n"
                + "OK-4,Name,,Hand Tools,,10,-5,,\n"
                + "OK-5,Name,,Hand Tools,,10,20,2.5,\n"
                + "OK-1,Duplicate,,Hand Tools,,10,20,,\n");

    assertThat(plan.rows()).hasSize(1);
    assertThat(plan.errorCount()).isEqualTo(6);
    assertThat(plan.errors())
        .extracting(ProductImportService.RowError::line)
        .containsExactly(3, 4, 5, 6, 7, 8);
    assertThat(plan.errors().get(5).message()).contains("line 2");
  }

  @Test
  @DisplayName("column headings are matched loosely, in any order")
  void looseHeadings() {
    ImportPlan plan = plan("price,Item Name,code,COST,category_name\n25,Bolt,B-1,10,Hand Tools\n");

    assertThat(plan.rows()).hasSize(1);
    assertThat(plan.rows().get(0).name()).isEqualTo("Bolt");
  }

  @Test
  @DisplayName("a missing required column stops the whole file, naming the column")
  void missingColumn() {
    assertThatThrownBy(() -> plan("SKU,Name,Category\nA,B,C\n"))
        .isInstanceOfSatisfying(
            ApiException.class,
            ex -> {
              assertThat(ex.getCode()).isEqualTo("MISSING_COLUMNS");
              assertThat(ex.getMessage()).contains("Buying price").contains("Selling price");
            });
  }

  @Test
  @DisplayName("a file with only a heading is refused")
  void headingOnly() {
    assertThatThrownBy(() -> plan(HEADING))
        .isInstanceOfSatisfying(
            ApiException.class, ex -> assertThat(ex.getCode()).isEqualTo("NO_ROWS"));
  }

  private ImportPlan plan(String csv) {
    return service.plan(new StringReader(csv));
  }
}
