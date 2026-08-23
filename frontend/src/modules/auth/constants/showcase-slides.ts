/**
 * Marketing panel content for the admin sign-in screen.
 *
 * Copy and imagery live here rather than inside the component so the client can
 * revise them without touching layout code. The photographs live in
 * `public/images/auth/` — see the README there for provenance, licensing and
 * the dimensions to match when swapping one out. If a file is ever missing the
 * panel falls back to a brand gradient rather than showing a broken image.
 */
export interface ShowcaseSlide {
  id: string;
  headline: string;
  description: string;
  /** Path under `public/`. */
  image: string;
  /** Describes the photograph for screen readers and when images fail to load. */
  imageAlt: string;
}

export const showcaseSlides: ShowcaseSlide[] = [
  {
    id: "operations",
    headline: "Streamline your hardware operations.",
    description:
      "Enterprise-grade management system designed for scale, efficiency, and complete operational oversight.",
    image: "/images/auth/showcase-operations.jpg",
    imageAlt:
      "A cordless drill, angle grinder and hand tools laid out on a steel workbench.",
  },
  {
    id: "inventory",
    headline: "Every item, accounted for.",
    description:
      "Real-time stock levels, automated reorder points, and a complete audit trail across every branch.",
    image: "/images/auth/showcase-inventory.jpg",
    imageAlt:
      "Rows of pliers and cutters standing organised in a workshop tool rack.",
  },
  {
    id: "insights",
    headline: "Decisions backed by data.",
    description:
      "Sales, margins, and supplier performance surfaced in reports your team can act on today.",
    image: "/images/auth/showcase-insights.jpg",
    imageAlt:
      "Plumbing fittings and fasteners sorted into labelled bins on a workbench.",
  },
];

/** Milliseconds each slide stays on screen before advancing. */
export const SLIDE_INTERVAL_MS = 7000;
