import { C } from "../theme.js";
import { usd0 } from "../format.js";

/**
 * HeadroomCard — live read-out of the max additional annual spend the plan can
 * absorb (or the current shortfall) to reach the plan horizon.
 *
 * @param {{ headroom: { delta: number, depAge: number|null, lastsToHorizon: boolean }, horizon: number }} props
 */
export function HeadroomCard({ headroom, horizon }) {
  if (!headroom) return null;
  const { delta, depAge } = headroom;
  const positive = delta >= 0;
  const color = positive ? C.viridian : C.clay;
  const bg = positive ? "rgba(30,122,94,.12)" : "rgba(190,74,43,.12)";

  return (
    <div
      aria-label="spending headroom"
      style={{
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 16,
        fontSize: 14,
        color: C.ink,
        lineHeight: 1.5,
      }}
    >
      {positive ? (
        <>
          You can{" "}
          <strong>raise spending by up to {usd0(delta)}/yr</strong> and still
          last to age {horizon}.
        </>
      ) : (
        <>
          Spending{" "}
          <strong>{usd0(-delta)}/yr over budget</strong>; savings run out at
          age {depAge ?? "unknown"}.
        </>
      )}
    </div>
  );
}
