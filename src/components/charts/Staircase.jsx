import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceDot, ReferenceLine,
} from "recharts";
import { LOCATIONS, TAX_YEAR } from "../../retirementData.js";
import { C, SRC } from "../theme.js";
import { Select } from "../atoms/index.jsx";
import { usd0, usdK } from "../format.js";
import { monthlyPI, payoffYear } from "../../finance/housing.js";
import { ChartFrame } from "./chartFrame.jsx";

/**
 * Staircase chart panel — income by source, year by year.
 *
 * Props:
 *   compRows        — array of row objects (age, ageB, "Salary (you)", …, need, extraSpend)
 *   depAge          — depletion age (number | null); root expression: simSS.depAge
 *   floorAtDep      — guaranteed floor income at depletion (number); root: floorAtDep
 *   needAtDep       — spending need at depletion (number); root: needAtDep
 *   hasRental       — whether any inherited property is rental (boolean); root: hasRental
 *   pensionOn       — whether the DRS pension is included (boolean); root: s.pensionOn
 *   spendBasis      — "income" | "location"; root: s.spendBasis
 *   retireLoc       — selected retirement location name (string); root: s.retireLoc
 *   onRetireLocChange — handler for retireLoc change; root: set("retireLoc")
 *   ageA            — your age now (number); root: s.ageA
 *   onYbyOpen       — open the year-by-year section; root: setYbyOpen
 *   onSelectYear    — select a calendar year; root: setSelYear
 *   compTip         — custom tooltip renderer component; root: compTip
 */
export function Staircase({
  compRows,
  depAge,
  floorAtDep,
  needAtDep,
  hasRental,
  pensionOn,
  spendBasis,
  retireLoc,
  onRetireLocChange,
  ageA,
  onYbyOpen,
  onSelectYear,
  compTip,
  spendingShape,
  housing,
  relocationYear,
  workLoc,
  printWidth,
}) {
  const locByName = (n) => LOCATIONS.find(l => l.name === n);

  // Relocation boundary: convert calendar year to age for the x-axis.
  const relocAge = (relocationYear != null && ageA != null)
    ? ageA + (relocationYear - TAX_YEAR)
    : null;

  // Housing band caption — compute payoff cliff year for mortgage tenure.
  const housingTenure = housing?.tenure;
  const isMortgage = housingTenure === "mortgage";
  const m = housing?.mortgage;
  const mpiMo = isMortgage ? monthlyPI(m?.principal, m?.ratePct, m?.termYears) : 0;
  const pOff = isMortgage ? payoffYear(m) : null;
  const pOffAge = pOff != null ? ageA + (pOff - TAX_YEAR) : null;

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 14px 12px", marginBottom: 16 }}>
      <div style={{ padding: "0 4px 6px" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>The staircase</div>
        <h3 style={{ margin: "2px 0 2px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19 }}>Income by source, year by year</h3>
        <p style={{ margin: "2px 0 8px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>The dashed line is your spending need — it rises in the pre-65 years to cover full-price healthcare, then drops when Medicare/local cover kicks in. The portfolio (gold) fills whatever the other sources don&apos;t.{depAge != null ? <> At the dotted line (<b style={{ color: C.clay }}>age {depAge}</b>) the gold runs out — savings are spent and you live on the guaranteed floor (SS{pensionOn ? " + pension" : ""}{hasRental ? " + rental" : ""}) of about <b style={{ color: C.clay }}>{usd0(floorAtDep)}/yr</b>{floorAtDep < needAtDep ? <>, roughly <b style={{ color: C.clay }}>{usd0(needAtDep - floorAtDep)}/yr short</b> of the need</> : <>, which still covers the need</>}.</> : <> The savings are never fully drawn down in this plan.</>}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 11.5, color: C.slate, fontWeight: 600 }}>{spendBasis === "location" ? "Cost-of-living basis:" : "Healthcare basis:"}</span>
          <div style={{ minWidth: 200, flex: "1 1 200px" }}><Select value={retireLoc} onChange={onRetireLocChange} options={LOCATIONS.map(l => l.name).sort((a, b) => a.localeCompare(b))} /></div>
          {spendBasis === "location" && <span style={{ fontSize: 11, color: C.brassDeep, fontWeight: 600 }}>drives the whole spend</span>}
        </div>
        {locByName(retireLoc)?.region !== "US" && (() => {
          const here = locByName(retireLoc);
          const usNat = LOCATIONS.find(l => l.name === "US -- national average");
          const gapYr = Math.max(0, (usNat.hcPre - here.hcPre) * 12);
          return (
            <div role="note" style={{ fontSize: 11.5, color: C.slate, marginTop: 2, lineHeight: 1.45 }}>
              Pre-65 healthcare here is <b style={{ color: C.ink }}>${here.hcPre.toLocaleString()}/mo</b> (couple). If you stayed in the US, full-price ACA runs ~<b style={{ color: C.ink }}>${usNat.hcPre.toLocaleString()}/mo</b> — about <b style={{ color: C.clay }}>{usd0(gapYr)}/yr more</b> until Medicare at 65. This plan assumes you live abroad.
            </div>
          );
        })()}
      </div>
      <ChartFrame printWidth={printWidth} height={252}>
        <ComposedChart data={compRows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }} style={{ cursor: "pointer" }}
          onClick={(e) => { const a = e && e.activeLabel; if (a != null) { onYbyOpen(true); onSelectYear(2026 + (Number(a) - ageA)); } }}>
          <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="age" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={{ stroke: C.line }} />
          <YAxis tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={compTip} />
          <Area type="stepAfter" dataKey="Salary (you)" stackId="1" stroke="none" fill={SRC.salA} />
          <Area type="stepAfter" dataKey="Salary (spouse)" stackId="1" stroke="none" fill={SRC.salB} />
          <Area type="stepAfter" dataKey="Rental" stackId="1" stroke="none" fill={SRC.rent} />
          <Area type="stepAfter" dataKey="Pension" stackId="1" stroke="none" fill={SRC.pension} />
          <Area type="stepAfter" dataKey="SS (you)" stackId="1" stroke="none" fill={SRC.ssA} />
          <Area type="stepAfter" dataKey="SS (spouse)" stackId="1" stroke="none" fill={SRC.ssB} />
          <Area type="stepAfter" dataKey="Portfolio" stackId="1" stroke="none" fill={SRC.wd} />
          <Line type="stepAfter" dataKey="need" stroke={C.clay} strokeWidth={1.6} strokeDasharray="5 4" dot={false} />
          {compRows.filter(r => r.extraSpend > 0).map((r, i) => (
            <ReferenceDot key={`ev${i}`} x={r.age} y={r.need} r={3.5} fill={C.brass} stroke="#fff" strokeWidth={1.2} ifOverflow="extendDomain" />
          ))}
          {depAge != null && <ReferenceLine x={depAge} stroke={C.clay} strokeWidth={1.4} strokeDasharray="2 2"
            label={{ value: `savings gone · age ${depAge}`, position: "insideTopRight", fontSize: 10.5, fill: C.clay }} />}
          {relocAge != null && <ReferenceLine x={relocAge} stroke={C.viridian} strokeWidth={1.2} strokeDasharray="4 3"
            label={{ value: `leave ${workLoc ?? "work"} · age ${relocAge}`, position: "insideTopLeft", fontSize: 10, fill: C.viridian }} />}
        </ComposedChart>
      </ChartFrame>
      <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap", padding: "8px 6px 2px" }}>
        {[["Salary (you)", SRC.salA], ["Salary (spouse)", SRC.salB], ...(hasRental ? [["Rental", SRC.rent]] : []), ["Pension", SRC.pension], ["SS (you)", SRC.ssA], ["SS (spouse)", SRC.ssB], ["Portfolio draw", SRC.wd]].map(([n, c]) => (
          <span key={n} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.slate }}><span style={{ width: 11, height: 11, borderRadius: 3, background: c }} />{n}</span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.slate }}><span style={{ width: 14, height: 0, borderTop: `2px dashed ${C.clay}` }} />spending need</span>
      </div>
      {spendingShape?.mode !== "flat" && (
        <p style={{ margin: "6px 6px 0", fontSize: 11, color: C.mut, lineHeight: 1.5 }}>
          Need line follows a retirement spending smile (
          <a href="https://retirementresearcher.com/retirement-spending-smile/" target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>Blanchett</a>
          ) — real spending eases through the active years, then rises late.
        </p>
      )}
      {housingTenure && housingTenure !== "own" && (
        <p style={{ margin: "6px 6px 0", fontSize: 11, color: C.slate, lineHeight: 1.5 }}>
          <b>Housing band:</b>{" "}
          {housingTenure === "rent" && <>
            Rent is included in the spending-need line as a real-flat obligation outside the 35% floor.
          </>}
          {isMortgage && mpiMo > 0 && <>
            Mortgage P&amp;I of <b style={{ color: C.ink }}>${Math.round(mpiMo).toLocaleString()}/mo</b> is
            included in the need line and deflates in real terms each year.
            {pOff != null && pOffAge != null && (
              <> The need line steps <b style={{ color: C.viridian }}>down</b> at payoff in{" "}
              <b style={{ color: C.ink }}>{pOff}</b>{" "}
              (your age <b style={{ color: C.ink }}>{Math.round(pOffAge)}</b>) as P&amp;I drops to zero —
              only property tax, insurance, and maintenance remain.</>
            )}
          </>}
        </p>
      )}
    </div>
  );
}
