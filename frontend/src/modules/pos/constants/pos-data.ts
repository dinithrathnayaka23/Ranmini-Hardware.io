import type { PosCategory, PosProduct } from "../types/pos.types";

/**
 * PLACEHOLDER DATA — replace with live figures from the Spring Boot API.
 *
 * Expected endpoints, once they exist:
 *   GET  /api/v1/pos/categories                  -> posCategories
 *   GET  /api/v1/pos/products?categoryId=&q=     -> posProducts
 *   POST /api/v1/pos/sales                       -> completes the order
 *
 * The terminal already takes its catalogue as a prop, so wiring live data is a
 * change to the page's data source, not to any component.
 */

/**
 * The "All Items" chip is part of the filter UI rather than a real category, so
 * it is declared here as a sentinel instead of being special-cased in markup.
 */
export const ALL_CATEGORIES = "all";

export const posCategories: PosCategory[] = [
  { id: ALL_CATEGORIES, label: "All Items" },
  { id: "cement-sand", label: "Cement & Sand" },
  { id: "paints-solvents", label: "Paints & Solvents" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "tools", label: "Tools" },
];

/**
 * Stock levels are deliberately varied so every card state is reachable while
 * the backend is still being built: a low-stock warning, an ordinary line, and
 * a sold-out product the till refuses to add.
 */
export const posProducts: PosProduct[] = [
  {
    id: "cem-001",
    sku: "CEM-001",
    name: "Cemex Portland 50kg",
    categoryId: "cement-sand",
    unitPrice: 2450,
    stock: 4,
    status: "LOW_STOCK",
    imageUrl: "/images/products/cement-portland.jpg",
  },
  {
    id: "pvc-100",
    sku: "PVC-100",
    name: 'PVC Pipe 1" 10ft',
    categoryId: "plumbing",
    unitPrice: 850,
    stock: 120,
    status: "IN_STOCK",
    imageUrl: "/images/products/pvc-pipe.jpg",
  },
  {
    id: "pnt-wht",
    sku: "PNT-WHT",
    name: "Emulsion Paint White 4L",
    categoryId: "paints-solvents",
    unitPrice: 4200,
    stock: 36,
    status: "IN_STOCK",
    imageUrl: "/images/products/emulsion-paint.jpg",
  },
  {
    id: "hw-nw2",
    sku: "HW-NW2",
    name: 'Wire Nails 2" (1kg)',
    categoryId: "tools",
    unitPrice: 350,
    stock: 210,
    status: "IN_STOCK",
    imageUrl: "/images/products/wire-nails.jpg",
  },
  {
    id: "plb-elb",
    sku: "PLB-ELB",
    name: 'PVC Elbow 1" 90°',
    categoryId: "plumbing",
    unitPrice: 180,
    stock: 340,
    status: "IN_STOCK",
    // No photograph on file — the card falls back to a neutral tile.
    imageUrl: null,
  },
  {
    id: "elc-wr15",
    sku: "ELC-WR15",
    name: "Copper Wire 1.5mm (100m)",
    categoryId: "electrical",
    unitPrice: 18500,
    stock: 12,
    status: "IN_STOCK",
    imageUrl: null,
  },
  {
    id: "elc-swt1",
    sku: "ELC-SWT1",
    name: "1-Gang Switch White",
    categoryId: "electrical",
    unitPrice: 420,
    stock: 6,
    status: "LOW_STOCK",
    imageUrl: null,
  },
  {
    id: "tol-hmr",
    sku: "TOL-HMR",
    name: "Claw Hammer 16oz",
    categoryId: "tools",
    unitPrice: 2900,
    stock: 0,
    status: "OUT_OF_STOCK",
    imageUrl: null,
  },
  {
    id: "cem-sand",
    sku: "CEM-SAND",
    name: "River Sand (cube)",
    categoryId: "cement-sand",
    unitPrice: 29500,
    stock: 8,
    status: "IN_STOCK",
    imageUrl: null,
  },
  {
    id: "pnt-thn",
    sku: "PNT-THN",
    name: "Paint Thinner 1L",
    categoryId: "paints-solvents",
    unitPrice: 980,
    stock: 54,
    status: "IN_STOCK",
    imageUrl: null,
  },
];

/** Which till this browser is. Comes from device configuration, eventually. */
export const TERMINAL_NAME = "POS Terminal 1";
