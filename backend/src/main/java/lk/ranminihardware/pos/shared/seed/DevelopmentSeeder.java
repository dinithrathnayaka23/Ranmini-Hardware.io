package lk.ranminihardware.pos.shared.seed;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.repository.CategoryRepository;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.catalog.service.ProductWrite;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Puts a usable shop into an empty development database.
 *
 * <p><b>Off unless explicitly switched on</b> ({@code ranmini.seed.enabled=true}),
 * and it refuses to touch a database that already has products. Seed data that
 * can appear in production is worse than no seed data at all: nobody notices
 * until a customer is charged for a fictional bag of cement.
 *
 * <p>Three things are loaded, in order, because each depends on the last:
 *
 * <ol>
 *   <li>ten categories and about fifty products — see {@link CatalogueFixture};
 *   <li>a cashier account, so the till can be signed into and so the seeded
 *       receipts have somebody real to name;
 *   <li>ninety days of sales — see {@link SalesHistorySeeder}.
 * </ol>
 *
 * <p>The sales history is the part that matters most for looking at the system.
 * Without it the dashboard and the reports open on a shop that has never sold
 * anything: empty charts, zeroes everywhere, and no way to tell a working screen
 * from a broken one.
 */
@Configuration
@ConditionalOnProperty(name = "ranmini.seed.enabled", havingValue = "true")
public class DevelopmentSeeder {

  private static final Logger log = LoggerFactory.getLogger(DevelopmentSeeder.class);

  /** The demonstration cashier. Created only when seeding, never in production. */
  private static final String CASHIER_USERNAME = "cashier";

  private static final String CASHIER_NAME = "Kasun Perera";

  @Bean
  ApplicationRunner seedShop(
      CategoryRepository categories,
      ProductRepository products,
      ProductService productService,
      StaffRepository staff,
      PasswordEncoder passwords,
      SalesHistorySeeder salesHistory,
      Clock clock) {

    return args -> {
      if (products.count() > 0) {
        log.info("Seed skipped: the catalogue already has {} product(s)", products.count());
        return;
      }

      log.warn("Seeding development data — this must never run against production data");

      Map<String, Category> bySlug = seedCategories(categories);
      List<Product> catalogue = seedProducts(productService, bySlug);
      List<SalesHistorySeeder.Cashier> cashiers = seedCashier(staff, passwords, clock);

      log.info("Seeded {} categories and {} products", bySlug.size(), catalogue.size());
      salesHistory.seed(catalogue, cashiers);
    };
  }

  private Map<String, Category> seedCategories(CategoryRepository categories) {
    Map<String, Category> bySlug = new HashMap<>();

    for (CatalogueFixture.CategorySpec spec : CatalogueFixture.categories()) {
      Category category =
          categories
              .findBySlug(spec.slug())
              .orElseGet(
                  () ->
                      categories.save(
                          Category.builder()
                              .name(spec.name())
                              .slug(spec.slug())
                              .displayOrder(spec.order())
                              .active(true)
                              .build()));

      bySlug.put(spec.slug(), category);
    }
    return bySlug;
  }

  /**
   * Creates the catalogue through {@link ProductService} rather than the
   * repository.
   *
   * <p>Slower, and deliberately so: the service is what normalises the SKU,
   * denormalises the category name onto the product and computes the stored
   * stock status. Writing documents straight to the repository would produce
   * fixtures subtly unlike anything the application itself creates — which is
   * how seed data ends up hiding the bug it should have caught.
   */
  private List<Product> seedProducts(
      ProductService productService, Map<String, Category> bySlug) {

    List<Product> created = new ArrayList<>();

    for (CatalogueFixture.ProductSpec spec : CatalogueFixture.products()) {
      Category category = bySlug.get(spec.categorySlug());
      if (category == null) {
        log.warn("Skipping {}: no category with slug {}", spec.sku(), spec.categorySlug());
        continue;
      }

      created.add(
          productService.create(
              new ProductWrite(
                  spec.sku(),
                  spec.name(),
                  spec.brand(),
                  category.getId(),
                  spec.unit(),
                  spec.cost(),
                  spec.price(),
                  spec.stock(),
                  spec.reorderLevel(),
                  spec.imagePath())));
    }
    return created;
  }

  /**
   * Creates the demonstration cashier and returns who the seeded sales are rung
   * up by.
   *
   * <p>The administrators are included alongside the cashier, because the owner
   * genuinely does cover the counter in a shop this size — and a sales ledger
   * where every receipt names the same person cannot demonstrate the question it
   * exists to answer.
   *
   * <p>The password is generated and logged once, exactly as the administrator
   * seeder does. A default cashier password committed to the repository would be
   * a working till login shared by every deployment of this code.
   */
  private List<SalesHistorySeeder.Cashier> seedCashier(
      StaffRepository staff, PasswordEncoder passwords, Clock clock) {

    StaffMember cashier =
        staff
            .findByUsername(CASHIER_USERNAME)
            .orElseGet(() -> createCashier(staff, passwords, clock));

    List<SalesHistorySeeder.Cashier> attribution = new ArrayList<>();
    attribution.add(new SalesHistorySeeder.Cashier(cashier.getId(), cashier.getFullName()));

    staff.findAll().stream()
        .filter(member -> member.getRole() == StaffRole.ADMIN)
        .forEach(
            admin ->
                attribution.add(
                    new SalesHistorySeeder.Cashier(admin.getId(), admin.getFullName())));

    return attribution;
  }

  private StaffMember createCashier(
      StaffRepository staff, PasswordEncoder passwords, Clock clock) {

    String password = generatePassword();

    StaffMember created =
        staff.save(
            StaffMember.builder()
                .fullName(CASHIER_NAME)
                .username(CASHIER_USERNAME)
                .email("cashier@ranminihardware.lk")
                .phone("+94 77 123 4567")
                .role(StaffRole.CASHIER)
                .status(StaffStatus.ACTIVE)
                .joinedOn(LocalDate.now(clock).minusMonths(8))
                .passwordHash(passwords.encode(password))
                .build());

    log.warn(
        """

        ============================================================
         Created demonstration cashier "{}" with a GENERATED password:

             {}

         Shown once. This account exists only because seeding is on.
        ============================================================
        """,
        CASHIER_USERNAME,
        password);

    return created;
  }

  /** A 24-character URL-safe password from {@link SecureRandom}. */
  private static String generatePassword() {
    byte[] bytes = new byte[18];
    new SecureRandom().nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
