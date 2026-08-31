package lk.ranminihardware.pos.shared.seed;

import java.math.BigDecimal;
import java.util.List;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.repository.CategoryRepository;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.catalog.service.ProductWrite;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Puts a usable catalogue into an empty development database.
 *
 * <p><b>Off unless explicitly switched on</b> ({@code ranmini.seed.enabled=true}),
 * and it refuses to touch a database that already has products. Seed data that
 * can appear in production is worse than no seed data at all: nobody notices
 * until a customer is charged for a fictional bag of cement.
 *
 * <p>The products mirror the ones on the frontend's till mock-up, so the two
 * halves of the project line up while they are being connected.
 */
@Configuration
@ConditionalOnProperty(name = "ranmini.seed.enabled", havingValue = "true")
public class DevelopmentSeeder {

  private static final Logger log = LoggerFactory.getLogger(DevelopmentSeeder.class);

  @Bean
  ApplicationRunner seedCatalogue(
      CategoryRepository categories, ProductRepository products, ProductService productService) {

    return args -> {
      if (products.count() > 0) {
        log.info("Seed skipped: the catalogue already has {} product(s)", products.count());
        return;
      }

      log.warn("Seeding development catalogue — this must never run against production data");

      Category cement = category(categories, "Cement & Sand", "cement-sand", 1);
      Category paints = category(categories, "Paints & Solvents", "paints-solvents", 2);
      Category plumbing = category(categories, "Plumbing", "plumbing", 3);
      Category electrical = category(categories, "Electrical", "electrical", 4);
      Category tools = category(categories, "Tools", "tools", 5);

      // Stock levels are varied deliberately so every card state on the till is
      // reachable without editing data by hand: a low-stock warning, ordinary
      // lines, and a sold-out product the till must refuse to add.
      List<ProductWrite> seed =
          List.of(
              write("CEM-001", "Cemex Portland 50kg", cement, "bags", "1900.00", "2450.00", 4, 5),
              write("CEM-SAND", "River Sand (cube)", cement, "cubes", "24000.00", "29500.00", 8, 3),
              write("PNT-WHT", "Emulsion Paint White 4L", paints, "tins", "3400.00", "4200.00", 36, 10),
              write("PNT-THN", "Paint Thinner 1L", paints, "bottles", "740.00", "980.00", 54, 12),
              write("PVC-100", "PVC Pipe 1\" 10ft", plumbing, "pcs", "620.00", "850.00", 120, 25),
              write("PLB-ELB", "PVC Elbow 1\" 90deg", plumbing, "pcs", "120.00", "180.00", 340, 50),
              write("ELC-WR15", "Copper Wire 1.5mm (100m)", electrical, "rolls", "15200.00", "18500.00", 12, 5),
              write("ELC-SWT1", "1-Gang Switch White", electrical, "pcs", "310.00", "420.00", 6, 10),
              write("HW-NW2", "Wire Nails 2\" (1kg)", tools, "kg", "260.00", "350.00", 210, 40),
              write("TOL-HMR", "Claw Hammer 16oz", tools, "pcs", "2100.00", "2900.00", 0, 4));

      seed.forEach(productService::create);
      log.info("Seeded {} categories and {} products", 5, seed.size());
    };
  }

  private static Category category(
      CategoryRepository categories, String name, String slug, int order) {

    return categories
        .findBySlug(slug)
        .orElseGet(
            () ->
                categories.save(
                    Category.builder()
                        .name(name)
                        .slug(slug)
                        .displayOrder(order)
                        .active(true)
                        .build()));
  }

  private static ProductWrite write(
      String sku,
      String name,
      Category category,
      String unit,
      String cost,
      String price,
      int stock,
      int reorderLevel) {

    return new ProductWrite(
        sku,
        name,
        null,
        category.getId(),
        unit,
        new BigDecimal(cost),
        new BigDecimal(price),
        stock,
        reorderLevel,
        null);
  }
}
