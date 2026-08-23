/**
 * Chart maths, kept out of the components.
 *
 * Deliberately dependency-free: these charts are a line, an area and an arc,
 * which is far less code than a charting library would add to the bundle, and
 * it keeps the rendered SVG something we fully control for accessibility.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Rounds an axis maximum up to a readable number.
 *
 * Axis ticks that read 0 / 1,500 / 3,000 are scanned instantly; ticks that read
 * 0 / 1,470 / 2,940 are not, even though they bound the data more tightly.
 */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;

  // A fine-grained ladder rather than just 1/2/5/10. Coarse steps round a peak
  // of 5,880 all the way up to 10,000, which leaves the data sitting in the
  // bottom half of the plot with the top half empty — the chart then reads as
  // a flatter trend than it is.
  const ladder = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = ladder.find((candidate) => normalised <= candidate) ?? 10;

  return step * magnitude;
}

/** Evenly spaced tick values from 0 up to `max`, inclusive. */
export function axisTicks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, index) => (max / count) * index);
}

/**
 * Builds an SVG path through the points using monotone cubic interpolation.
 *
 * Smoothing is chosen carefully here. A plain Catmull-Rom spline overshoots
 * between points, which on a revenue chart would draw a peak higher than any
 * day actually earned — the curve would be inventing data. The Fritsch–Carlson
 * monotone variant is constrained so the curve never exceeds the values it
 * joins, so the smoothing is cosmetic rather than misleading.
 */
export function monotoneLinePath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;

  const tangents = monotoneTangents(points);
  let path = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i]!;
    const next = points[i + 1]!;
    const third = (next.x - current.x) / 3;

    const control1X = current.x + third;
    const control1Y = current.y + tangents[i]! * third;
    const control2X = next.x - third;
    const control2Y = next.y - tangents[i + 1]! * third;

    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
  }

  return path;
}

/** Closes a line path down to a baseline, giving the area fill its shape. */
export function areaPathFrom(linePath: string, points: Point[], baselineY: number): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

/** Fritsch–Carlson tangents: the constraint that stops the curve overshooting. */
function monotoneTangents(points: Point[]): number[] {
  const count = points.length;
  const secants: number[] = [];

  for (let i = 0; i < count - 1; i += 1) {
    const run = points[i + 1]!.x - points[i]!.x;
    secants.push(run === 0 ? 0 : (points[i + 1]!.y - points[i]!.y) / run);
  }

  const tangents: number[] = new Array(count);
  tangents[0] = secants[0] ?? 0;
  tangents[count - 1] = secants[count - 2] ?? 0;

  for (let i = 1; i < count - 1; i += 1) {
    tangents[i] = (secants[i - 1]! + secants[i]!) / 2;
  }

  for (let i = 0; i < count - 1; i += 1) {
    const secant = secants[i]!;

    // A flat segment must stay flat, or the curve would bulge through it.
    if (secant === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }

    const alpha = tangents[i]! / secant;
    const beta = tangents[i + 1]! / secant;
    const magnitude = alpha * alpha + beta * beta;

    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude);
      tangents[i] = scale * alpha * secant;
      tangents[i + 1] = scale * beta * secant;
    }
  }

  return tangents;
}

/**
 * Describes a donut segment as an SVG arc path.
 *
 * Angles run clockwise from twelve o'clock, which is where a reader expects a
 * share chart to start.
 */
export function donutSegmentPath(
  startFraction: number,
  endFraction: number,
  outerRadius: number,
  innerRadius: number,
  centre: number,
): string {
  const startAngle = fractionToRadians(startFraction);
  const endAngle = fractionToRadians(endFraction);
  const isLargeArc = endFraction - startFraction > 0.5 ? 1 : 0;

  const outerStart = polar(centre, outerRadius, startAngle);
  const outerEnd = polar(centre, outerRadius, endAngle);
  const innerEnd = polar(centre, innerRadius, endAngle);
  const innerStart = polar(centre, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${isLargeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${isLargeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function fractionToRadians(fraction: number): number {
  // Rotate by a quarter turn so zero sits at the top rather than at 3 o'clock.
  return fraction * 2 * Math.PI - Math.PI / 2;
}

function polar(centre: number, radius: number, angle: number): Point {
  return {
    x: centre + radius * Math.cos(angle),
    y: centre + radius * Math.sin(angle),
  };
}
