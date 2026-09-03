package lk.ranminihardware.pos.shared.seed;

import java.math.BigDecimal;
import java.util.List;

/**
 * The demonstration catalogue: what a Kegalle hardware shop actually stocks.
 *
 * <p>Held apart from the seeder that loads it because it is data, not logic, and
 * because it is the part somebody will want to edit. Ten categories and roughly
 * fifty lines — enough that the inventory table pages, the till's category
 * filter earns its place, the reports' category breakdown has a tail to
 * truncate, and the low-stock panel has more than one row.
 *
 * <p><b>The prices are plausible rather than invented.</b> Cement moves at a
 * hundreds-of-rupees margin on a two-thousand-rupee bag; a box of screws doubles
 * its money. Reports built on uniform round numbers look convincing and teach
 * you nothing about whether the margin column is right.
 *
 * <p>Stock levels are varied on purpose so every state on every screen is
 * reachable without editing data by hand: lines that are healthy, several at or
 * under their reorder level, and two that are sold out — which the till must
 * refuse to sell and the notification bell must report.
 */
final class CatalogueFixture {

  private CatalogueFixture() {}

  /** A category and its display order. */
  record CategorySpec(String name, String slug, int order) {}

  /**
   * One product.
   *
   * @param imagePath a photograph already shipped under the frontend's
   *     {@code public/images/products/}, or null for the neutral tile. Uploaded
   *     photographs are stored in the database instead; these few exist so a
   *     fresh install has some pictures on the till without anyone uploading
   *     any.
   * @param popularity a rough weight for the sales generator — how often this
   *     line sells relative to the others. Cement and PVC pipe move every day; a
   *     circular saw does not, and a demo where everything sells equally makes
   *     the best-sellers list meaningless.
   */
  record ProductSpec(
      String sku,
      String name,
      String brand,
      String categorySlug,
      String unit,
      BigDecimal cost,
      BigDecimal price,
      int stock,
      int reorderLevel,
      String imagePath,
      int popularity) {}

  static List<CategorySpec> categories() {
    return List.of(
        new CategorySpec("Cement & Sand", "cement-sand", 1),
        new CategorySpec("Paints & Solvents", "paints-solvents", 2),
        new CategorySpec("Plumbing", "plumbing", 3),
        new CategorySpec("Electrical", "electrical", 4),
        new CategorySpec("Tools", "tools", 5),
        new CategorySpec("Fasteners", "fasteners", 6),
        new CategorySpec("Timber & Boards", "timber-boards", 7),
        new CategorySpec("Adhesives & Sealants", "adhesives-sealants", 8),
        new CategorySpec("Safety & Site", "safety-site", 9),
        new CategorySpec("Garden & Outdoor", "garden-outdoor", 10));
  }

  static List<ProductSpec> products() {
    return List.of(
        // ------------------------------ Cement & sand -----------------------
        product("CEM-001", "Cemex Portland 50kg", "Tokyo Super", "cement-sand", "bags",
            "1900.00", "2450.00", 4, 5, "/images/products/cement-portland.jpg", 10),
        product("CEM-002", "Insee Sanstha Cement 50kg", "Insee", "cement-sand", "bags",
            "1850.00", "2380.00", 96, 20, null, 9),
        product("CEM-SAND", "River Sand (cube)", null, "cement-sand", "cubes",
            "24000.00", "29500.00", 8, 3, null, 5),
        product("CEM-MTL", "Metal Chips 3/4in (cube)", null, "cement-sand", "cubes",
            "18500.00", "23000.00", 6, 3, null, 4),
        product("CEM-BLK", "Cement Block 6in", null, "cement-sand", "pcs",
            "78.00", "115.00", 1450, 300, null, 7),

        // ------------------------------ Paints ------------------------------
        product("PNT-WHT", "Emulsion Paint White 4L", "Multilac", "paints-solvents", "tins",
            "3400.00", "4200.00", 36, 10, "/images/products/emulsion-paint.jpg", 8),
        product("PNT-CLR", "Emulsion Paint Colour 4L", "Multilac", "paints-solvents", "tins",
            "3800.00", "4750.00", 22, 10, null, 6),
        product("PNT-ENM", "Enamel Gloss White 1L", "Dulux", "paints-solvents", "tins",
            "1650.00", "2100.00", 41, 12, null, 5),
        product("PNT-THN", "Paint Thinner 1L", null, "paints-solvents", "bottles",
            "740.00", "980.00", 54, 12, null, 6),
        product("PNT-BRS", "Paint Brush 3in", "Harris", "paints-solvents", "pcs",
            "310.00", "520.00", 88, 20, null, 7),
        product("PNT-RLR", "Paint Roller Set 9in", null, "paints-solvents", "sets",
            "620.00", "980.00", 34, 10, null, 5),

        // ------------------------------ Plumbing ----------------------------
        product("PVC-100", "PVC Pipe 1in 10ft", "S-Lon", "plumbing", "pcs",
            "620.00", "850.00", 120, 25, "/images/products/pvc-pipe.jpg", 10),
        product("PVC-050", "PVC Pipe 1/2in 10ft", "S-Lon", "plumbing", "pcs",
            "390.00", "560.00", 164, 30, null, 9),
        product("PLB-ELB", "PVC Elbow 1in 90deg", "S-Lon", "plumbing", "pcs",
            "120.00", "180.00", 340, 50, null, 9),
        product("PLB-TEE", "PVC Tee 1in", "S-Lon", "plumbing", "pcs",
            "140.00", "210.00", 210, 50, null, 7),
        product("PLB-TAP", "Bib Tap Chrome 1/2in", "Rocell", "plumbing", "pcs",
            "1450.00", "1990.00", 27, 8, null, 6),
        product("PLB-SOL", "PVC Solvent Cement 250ml", "S-Lon", "plumbing", "tins",
            "480.00", "690.00", 62, 15, null, 8),
        product("PLB-TNK", "Water Tank 500L", "Arpico", "plumbing", "pcs",
            "18500.00", "23900.00", 3, 2, null, 2),

        // ------------------------------ Electrical --------------------------
        product("ELC-WR15", "Copper Wire 1.5mm 100m", "Kelani", "electrical", "rolls",
            "15200.00", "18500.00", 12, 5, null, 4),
        product("ELC-WR25", "Copper Wire 2.5mm 100m", "Kelani", "electrical", "rolls",
            "23800.00", "28400.00", 9, 4, null, 4),
        product("ELC-SWT1", "1-Gang Switch White", "Orel", "electrical", "pcs",
            "310.00", "420.00", 6, 10, null, 7),
        product("ELC-SKT", "13A Socket Outlet", "Orel", "electrical", "pcs",
            "590.00", "820.00", 74, 20, null, 7),
        product("ELC-BLB", "LED Bulb 9W", "Philips", "electrical", "pcs",
            "340.00", "520.00", 156, 40, null, 9),
        product("ELC-TUB", "LED Tube 18W 4ft", "Philips", "electrical", "pcs",
            "780.00", "1150.00", 48, 15, null, 6),
        product("ELC-CB16", "Circuit Breaker 16A", "Schneider", "electrical", "pcs",
            "1180.00", "1620.00", 31, 10, null, 5),
        product("ELC-TAPE", "Insulation Tape", "3M", "electrical", "rolls",
            "85.00", "150.00", 240, 60, null, 8),

        // ------------------------------ Tools -------------------------------
        product("TOL-HMR", "Claw Hammer 16oz", "Stanley", "tools", "pcs",
            "2100.00", "2900.00", 0, 4, null, 4),
        product("TOL-SCR", "Screwdriver Set 6pc", "Stanley", "tools", "sets",
            "1750.00", "2450.00", 23, 6, null, 5),
        product("TOL-TAPE", "Measuring Tape 5m", "Stanley", "tools", "pcs",
            "620.00", "950.00", 57, 15, null, 7),
        product("TOL-PLR", "Combination Plier 8in", "Ingco", "tools", "pcs",
            "890.00", "1350.00", 34, 10, null, 5),
        product("TOL-SAW", "Hand Saw 22in", "Bahco", "tools", "pcs",
            "1980.00", "2750.00", 14, 5, null, 3),
        product("TOL-DRL", "Impact Drill 650W", "Bosch", "tools", "pcs",
            "14500.00", "18900.00", 5, 3, null, 2),
        product("TOL-BLD", "Drill Bit Set 13pc", "Bosch", "tools", "sets",
            "1650.00", "2400.00", 26, 8, null, 4),
        product("TOL-TRW", "Mason Trowel 10in", null, "tools", "pcs",
            "740.00", "1150.00", 42, 12, null, 6),

        // ------------------------------ Fasteners ---------------------------
        product("HW-NW2", "Wire Nails 2in 1kg", null, "fasteners", "kg",
            "260.00", "350.00", 210, 40, "/images/products/wire-nails.jpg", 9),
        product("HW-NW4", "Wire Nails 4in 1kg", null, "fasteners", "kg",
            "255.00", "345.00", 168, 40, null, 7),
        product("HW-SCR8", "Wood Screw 8x1.5in 100pc", null, "fasteners", "boxes",
            "420.00", "690.00", 92, 20, null, 8),
        product("HW-WAL", "Wall Plug 8mm 100pc", null, "fasteners", "boxes",
            "310.00", "540.00", 118, 25, null, 8),
        product("HW-BLT", "Anchor Bolt 10mm", null, "fasteners", "pcs",
            "95.00", "165.00", 380, 80, null, 6),
        product("HW-HNG", "Door Hinge 4in", null, "fasteners", "pairs",
            "380.00", "620.00", 64, 15, null, 5),

        // ------------------------------ Timber ------------------------------
        product("TMB-PLY", "Plywood Board 4x8ft 12mm", null, "timber-boards", "sheets",
            "8400.00", "10900.00", 18, 6, null, 4),
        product("TMB-MDF", "MDF Board 4x8ft 9mm", null, "timber-boards", "sheets",
            "5200.00", "6800.00", 11, 5, null, 3),
        product("TMB-BAT", "Timber Batten 2x2in 12ft", null, "timber-boards", "pcs",
            "1150.00", "1580.00", 76, 20, null, 5),

        // ------------------------------ Adhesives ---------------------------
        product("ADH-SIL", "Silicone Sealant Clear", "Dow", "adhesives-sealants", "tubes",
            "620.00", "950.00", 84, 20, null, 8),
        product("ADH-WOD", "Wood Glue 500ml", "Fevicol", "adhesives-sealants", "bottles",
            "540.00", "820.00", 47, 12, null, 6),
        product("ADH-EPX", "Epoxy Adhesive 100g", "Araldite", "adhesives-sealants", "packs",
            "780.00", "1180.00", 29, 10, null, 4),

        // ------------------------------ Safety ------------------------------
        product("SAF-GLV", "Work Gloves", null, "safety-site", "pairs",
            "220.00", "390.00", 132, 30, null, 7),
        product("SAF-HLM", "Safety Helmet", "Karam", "safety-site", "pcs",
            "980.00", "1450.00", 21, 8, null, 3),
        product("SAF-GOG", "Safety Goggles", null, "safety-site", "pcs",
            "340.00", "560.00", 0, 10, null, 4),

        // ------------------------------ Garden ------------------------------
        product("GRD-HOS", "Garden Hose 1/2in 15m", null, "garden-outdoor", "rolls",
            "1980.00", "2850.00", 16, 6, null, 4),
        product("GRD-MAM", "Mammoty with Handle", null, "garden-outdoor", "pcs",
            "1450.00", "2100.00", 24, 8, null, 5),
        product("GRD-WHL", "Wheelbarrow 80L", null, "garden-outdoor", "pcs",
            "9800.00", "13500.00", 4, 3, null, 2));
  }

  private static ProductSpec product(
      String sku,
      String name,
      String brand,
      String categorySlug,
      String unit,
      String cost,
      String price,
      int stock,
      int reorderLevel,
      String imagePath,
      int popularity) {

    return new ProductSpec(
        sku,
        name,
        brand,
        categorySlug,
        unit,
        new BigDecimal(cost),
        new BigDecimal(price),
        stock,
        reorderLevel,
        imagePath,
        popularity);
  }
}
