import { C } from "../theme.js";
import { usd0 } from "../format.js";

/**
 * Accumulation summary card — working-years read-out, symmetric to Headline.
 * Shown only while yearsToRet > 0 (caller gates rendering).
 *
 * @param {{ accumulation: object, retYear: number }} props
 */
export function AccumulationSummary({ accumulation, retYear }) {
  const { totalContrib, totalGrowth, balAtRet, blendedReturn, workingYears } = accumulation;

  return (
    <div
      className="rc-stat"
      style={{
        background: C.ink,
        borderRadius: 14,
        padding: "22px 24px",
        color: "#F4F1E8",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: C.brass,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        Accumulation through retirement ({workingYears} working year{workingYears !== 1 ? "s" : ""})
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 42,
            fontWeight: 600,
            lineHeight: 1,
            color: "#fff",
          }}
        >
          {usd0(balAtRet)}
        </div>
        <div style={{ fontSize: 13, color: "#C9D3CF" }}>at retirement · today's dollars</div>
      </div>

      <div style={{ marginTop: 6, fontSize: 13.5, color: "#C9D3CF" }}>
        Projected balance at retirement around {retYear}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          fontSize: 13,
          color: "#C9D3CF",
        }}
      >
        <div>
          <span style={{ color: C.brass, fontWeight: 600 }}>Total contributed</span>
          <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>
            {usd0(totalContrib)}
          </span>
        </div>
        <div>
          <span style={{ color: C.brass, fontWeight: 600 }}>Total growth</span>
          <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>
            {usd0(totalGrowth)}
          </span>
        </div>
        <div>
          <span style={{ color: C.brass, fontWeight: 600 }}>Blended return</span>
          <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>
            {(blendedReturn * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 11.5, color: "#9FB0AB", lineHeight: 1.5 }}>
        Contributions and portfolio growth summed over years while at least one spouse is still working.
        Blended return is a geometric estimate over the accumulation period — not a guarantee.
      </div>
    </div>
  );
}
