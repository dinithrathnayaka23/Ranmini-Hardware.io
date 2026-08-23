/**
 * Semantic accents shared by stat cards, badges and status text.
 *
 * Centralised because the same five meanings recur across the portal, and a
 * component that invents its own colour mapping is how two screens end up
 * disagreeing about what "warning" looks like.
 */
export type Accent = "brand" | "success" | "warning" | "danger" | "neutral";

/** Foreground colour — labels, values, captions. */
export const accentText: Record<Accent, string> = {
  brand: "text-brand-600",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted",
};

/** Tinted fill plus matching foreground — icon chips and pills. */
export const accentChip: Record<Accent, string> = {
  brand: "bg-brand-50 text-brand-600",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-canvas-subtle text-muted",
};

/** Border colour, for cards that need to draw the eye. */
export const accentBorder: Record<Accent, string> = {
  brand: "border-brand-600/35",
  success: "border-success/35",
  warning: "border-warning/45",
  danger: "border-danger/40",
  neutral: "border-line-strong",
};

/** Very light row wash used to tint a table row by its status. */
export const accentRow: Record<Accent, string> = {
  brand: "bg-brand-50/40",
  success: "bg-success-soft/40",
  warning: "bg-warning-soft/60",
  danger: "bg-danger-soft/60",
  neutral: "",
};
