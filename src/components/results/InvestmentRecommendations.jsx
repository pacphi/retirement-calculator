import { C } from "../theme.js";
import { usd0 } from "../format.js";
import { derivePhase, recommendFunds, allocateAccounts } from "../../investmentAdvisor.js";

const PHASE_LABEL = { accumulation: "Accumulation (while working)", decumulation: "Decumulation (in retirement)" };

function AllocationTable({ recommendation }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 14 }}>
      <thead>
        <tr>
          {["Fund", "Vehicle", "Target %", "Source"].map((h) => (
            <th key={h} style={{ textAlign: h === "Target %" ? "right" : "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.line}` }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {recommendation.map(({ fund, targetPct }) => (
          <tr key={fund.id}>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{fund.ticker}</span> · {fund.name}
            </td>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>{fund.vehicle}</td>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>
              {targetPct.toFixed(0)}%
            </td>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>
              <a href={fund.citation} target="_blank" rel="noreferrer" style={{ color: C.brassDeep, fontSize: 11 }}>{fund.returnBasis}</a>
              <br />
              <a href={fund.signupUrl} target="_blank" rel="noreferrer" style={{ color: C.brassDeep, fontWeight: 700, fontSize: 11 }}>Get started ↗</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AccountBreakdown({ accounts, recommendation }) {
  const allocations = allocateAccounts(accounts, recommendation);
  if (!allocations.length) {
    return <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14 }}>Add accounts in the Investments step to see a per-account breakdown.</div>;
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 14 }}>
      <thead>
        <tr>
          {["Account", "Fund", "Amount", "Note"].map((h) => (
            <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.line}` }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {allocations.flatMap(({ account, lines, note }) =>
          lines.map((line, i) => (
            <tr key={`${account.id}-${line.fund.id}`}>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>{i === 0 ? account.name : ""}</td>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, fontFamily: "'JetBrains Mono',monospace" }}>{line.fund.ticker}</td>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{usd0(line.amount)}</td>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.mut }}>{i === 0 ? note ?? "—" : ""}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/**
 * Investment Recommendations — self-contained report section. Derives the
 * household's phase from existing plan ages (no new input), recommends
 * curated funds per risk tier × phase, and renders a per-account breakdown
 * when the user entered accounts in the Investments step.
 *
 * @param {{ s: object }} props
 */
export function InvestmentRecommendations({ s }) {
  const phase = derivePhase(s);
  const previewBothPhases = !!s.previewBothPhases && phase !== "both";
  const phases = phase === "both" || previewBothPhases ? ["accumulation", "decumulation"] : [phase];
  const riskTolerance = s.riskTolerance || "moderate";
  const accreditedInvestor = !!s.accreditedInvestor;

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>Investment recommendations</div>
      <h3 style={{ margin: "2px 0 10px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19, color: C.ink }}>
        Curated funds for your risk tolerance and phase
      </h3>

      <div role="note" style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 14, borderLeft: `3px solid ${C.clay}` }}>
        Planning-grade, not advice-grade. Not a fiduciary recommendation. Past performance does not guarantee future results.
      </div>

      {riskTolerance === "aggressive" && !accreditedInvestor && (
        <div role="note" style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 14, borderLeft: `3px solid ${C.brass}` }}>
          Some aggressive-tier options require accredited-investor status — check the box on the Investments step to include them.
        </div>
      )}

      {previewBothPhases && (
        <div role="note" style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 14, borderLeft: `3px solid ${C.brass}` }}>
          Previewing both phases — your actual phase based on your ages is {PHASE_LABEL[phase].toLowerCase()}. Turn this off on the Investments step to see only your actual phase.
        </div>
      )}

      {phases.map((p) => {
        const recommendation = recommendFunds({ riskTolerance, phase: p, accreditedInvestor });
        return (
          <div key={p} style={{ marginBottom: 18 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 14.5, fontWeight: 600, color: C.ink }}>{PHASE_LABEL[p]}</h4>
            <AllocationTable recommendation={recommendation} />
            <AccountBreakdown accounts={s.investmentAccounts} recommendation={recommendation} />
          </div>
        );
      })}
    </div>
  );
}
