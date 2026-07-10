/**
 * Shared chart annotation helpers.
 *
 * milestoneLabel — a readable chip for ReferenceLine labels: a rounded surface
 * pill with a hairline border in the milestone's color, so the text never
 * fights the bars or gridlines behind it. Labels that sit close together in x
 * are separated with `row` (each row steps the chip down), which is how the
 * staircase keeps "paychecks end · 65" and "leave WA · 66" apart.
 *
 * Usage:
 *   <ReferenceLine x={age} label={milestoneLabel(`RMDs · ${age}`, { color: C.clay, anchor: "start" })} />
 *
 * For a vertical ReferenceLine, Recharts hands the label renderer a viewBox
 * whose x is the line position and y the plot top.
 */
const CHIP_H = 17;
const ROW_STEP = 20;

export const milestoneLabel = (value, { row = 0, anchor = "middle", color = "var(--slate)" } = {}) => ({ viewBox }) => {
  const text = String(value);
  // ~width of 10.5px Inter semibold, plus chip padding.
  const w = Math.round(text.length * 6.1) + 14;
  let x = anchor === "start" ? viewBox.x + 6 : anchor === "end" ? viewBox.x - w - 6 : viewBox.x - w / 2;
  if (x < 2) x = 2; // keep the chip inside the plot on the left edge
  const y = viewBox.y + 3 + row * ROW_STEP;
  return (
    <g>
      <rect x={x} y={y} width={w} height={CHIP_H} rx={CHIP_H / 2} fill="var(--surface)" fillOpacity={0.94}
        stroke={color} strokeOpacity={0.55} strokeWidth={1} />
      <text x={x + w / 2} y={y + CHIP_H / 2 + 3.5} textAnchor="middle" fontSize={10.5} fontWeight={600}
        fontFamily="'Inter', system-ui, sans-serif" fill={color}>{text}</text>
    </g>
  );
};
