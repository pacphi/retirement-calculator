import { Children, cloneElement, isValidElement } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * ChartFrame — wraps a single Recharts chart element so it can render two ways:
 *
 *   - On screen (printWidth falsy): a normal ResponsiveContainer that measures its parent.
 *   - For print (printWidth set): an EXPLICITLY sized chart with animation disabled on every
 *     series. Explicit width/height means Recharts never needs to measure the DOM — so charts
 *     draw fully and correctly even inside a `display:none` print container, and disabling
 *     animation guarantees the SVG is complete before window.print() captures it. This is what
 *     fixes charts overlapping / spilling out of bounds in the exported PDF.
 *
 * @param {{ printWidth?: number, height: number, children: React.ReactElement }} props
 */
export function ChartFrame({ printWidth, height, children }) {
  if (!printWidth) {
    return <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>;
  }
  // Disable animation on every series so the chart is fully painted for the print snapshot.
  const series = Children.map(children.props.children, (c) =>
    isValidElement(c) ? cloneElement(c, { isAnimationActive: false }) : c);
  return cloneElement(children, { width: printWidth, height, children: series });
}
