import { useState, useRef, useEffect } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DEFAULT_LIFE, DEFAULT_LIFE_EVENTS, DEFAULT_TRAVEL, LOCATIONS, MC_DEFAULTS, SINGLE_COST_FACTOR, SOURCES } from "./src/retirementData.js";
import { C, SRC, FONTS } from "./src/components/theme.js";
import { Chevron, NestLogo } from "./src/components/atoms/index.jsx";
import {
  afcIsAuto,
  resolveAfc,
} from "./src/calculatorCore.js";
import { Staircase } from "./src/components/charts/Staircase.jsx";
import { YearByYear } from "./src/components/charts/YearByYear.jsx";
import { PortfolioFlows } from "./src/components/charts/PortfolioFlows.jsx";
import { LongRun } from "./src/components/charts/LongRun.jsx";
import { Places } from "./src/components/charts/Places.jsx";
import { Compare } from "./src/components/charts/Compare.jsx";
import { IncomeMix } from "./src/components/charts/IncomeMix.jsx";
import { Headline } from "./src/components/results/Headline.jsx";
import { Stats } from "./src/components/results/Stats.jsx";
import { RiskTable } from "./src/components/results/RiskTable.jsx";
import { Inheritance as InheritanceResult } from "./src/components/results/Inheritance.jsx";
import { Household } from "./src/components/steps/Household.jsx";
import { Timing } from "./src/components/steps/Timing.jsx";
import { Pension } from "./src/components/steps/Pension.jsx";
import { Inheritance as InheritanceStep } from "./src/components/steps/Inheritance.jsx";
import { Milestones } from "./src/components/steps/Milestones.jsx";
import { TravelLongevity } from "./src/components/steps/TravelLongevity.jsx";
import { Advanced } from "./src/components/steps/Advanced.jsx";
import { usePlan } from "./src/hooks/usePlan.js";
import { useMonteCarlo } from "./src/hooks/useMonteCarlo.js";
import { usd0 } from "./src/components/format.js";

/* ------------------------ Format + tiers ------------------------ */

export const mcSummaryLines = (mc, horizon = 95) => mc ? [
  `Success probability: ${Math.round(mc.successProb * 100)}%`,
  `Median sustainable income: ${mc.sustainableIncome.p50.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0})}`,
  `Worst-case (10th pct) savings run out at age: ${mc.depletionAge.p10 > horizon ? `beyond ${horizon}` : mc.depletionAge.p10}`,
] : [];

/* ---------------------------- Main ---------------------------- */
export default function RetirementCalculator() {
  const [s, setS] = useState({
    ageA:57, ageB:48, stopA:65, stopB:56, claimA:65, claimB:65, pensionAge:65,
    incomeA:0, incomeB:170000, savings:670000, contrib:18000, targetPct:0.40, status:"married",
    ssModeA:"statement", ssModeB:"statement", ssFraA:50424, ssFraB:31592,
    pensionOn:true, system:"TRS", plan:3, pYears:22, afc:170000,
    realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
    ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
    retireLoc:"Austria", spendBasis:"income", lifestyle:100,
    tx:{ on:false, value:790000, year:2038, strategy:"rent" },
    at:{ on:true, value:324000, year:2040, strategy:"live" },
    travel: { ...DEFAULT_TRAVEL },
    events: DEFAULT_LIFE_EVENTS.map((e) => ({ ...e })),
    life: { ...DEFAULT_LIFE },
    survivor: { on:false, year:2055, pensionPct:0 },
    ltc: { on:false, startAge:80, years:3, annual:null },
    horizonAge: 95,
    stateRate: null,
  });
  const [couple, setCouple] = useState(true);
  const [stage, setStage] = useState("post");
  const [adv, setAdv] = useState(false);
  const [deferredMode, setDeferredMode] = useState("pct"); // "pct" | "amt" -- view for the pre-tax share
  const [invView, setInvView] = useState("flow"); // "flow" | "buckets" | "bucketsRmd" -- investments chart view
  const [selYear, setSelYear] = useState(null); // selected calendar year for the year-by-year navigator (null -> default)
  const [playing, setPlaying] = useState(false); // auto-advance the year navigator
  const [ybyView, setYbyView] = useState("month"); // "month" (annual ÷ 12) | "year" (annual totals)
  const [ybyOpen, setYbyOpen] = useState(true); // collapse the year-by-year section
  const [openLoc, setOpenLoc] = useState("Portugal");
  const [cmpA, setCmpA] = useState("Austria");
  const [cmpB, setCmpB] = useState("US -- Texas / Florida");
  const set = (k) => (v) => setS(p => ({ ...p, [k]: v }));
  const setProp = (key, field) => (v) => setS(p => ({ ...p, [key]: { ...p[key], [field]: v } }));

  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  // Default to a compact header on phones and iPad-like / touch devices, where the full
  // header would eat too much fixed vertical space. Set once on load; the user can still toggle.
  const [headerCollapsed, setHeaderCollapsed] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width:1024px), (pointer:coarse)").matches
      : false);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderH(el.offsetHeight);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // Auto-advance the year-by-year navigator while "play" is on; stop at the last year.
  // The play button seeds selYear to a concrete year on start, so `y` is never null here.
  useEffect(() => {
    if (!playing) return;
    // The simulation runs to the horizon for the younger spouse (the life-expectancy
    // model may end sooner; render clamps to the real last row regardless).
    const stopCal = 2026 + Math.max(0, (Number(s.horizonAge) || 95) - Math.min(s.ageA, s.ageB));
    const id = setInterval(() => {
      setSelYear((y) => {
        const cur = y == null ? stopCal : y;
        if (cur >= stopCal) { setPlaying(false); return cur; }
        return cur + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, s.horizonAge, s.ageA, s.ageB]);

  const eventSeq = useRef(0);
  const addEvent = () => {
    const id = `evt-${eventSeq.current++}`;
    set("events")([...s.events, { id, label: "New milestone", on: true, year: 2040, amount: 10000 }]);
  };
  const removeEvent = (idx) => set("events")(s.events.filter((_, i) => i !== idx));

  // Plan derivation (calc + all downstream memos)
  const {
    incomeHH, inher,
    simFull, simTrust, simNone,
    steady, sFull, sTrust, sNone,
    effHaircut, effCutYear,
    simSS, simNo,
    locRows, compRows, balRows, invRows, incomeStack,
    sFactor,
  } = usePlan(s, couple, stage);

  // Monte Carlo worker lifecycle
  const { mc, mcRunning, runMc } = useMonteCarlo(s);

  const afcAuto = afcIsAuto(s);
  const afcEff = resolveAfc(s);

  const onTrack = steady.net >= steady.targetNeed;
  const horizon = Number(s.horizonAge) || 95;
  const yearsToRet = Math.max(0, steady.startAgeA - s.ageA);
  const retYear = 2026 + yearsToRet;
  const inflFactor = Math.pow(1 + s.inflation, yearsToRet);

  const sellDots = simSS.rows.filter(r => r.sellLump > 0).map(r => ({ age:r.aA, bal:r.bal }));
  const hasRental = inher.some(p => p.type === "rent");

  const firstRmdAge = (simSS.rows.find(r => (r.forcedRmd || 0) > 0) || {}).aA ?? null;

  // Depletion: the age the portfolio runs out (if it does) and the guaranteed
  // income floor — SS + pension + rental — the household lives on afterward.
  const depAge = simSS.depAge;
  const depRow = depAge != null ? simSS.rows.find(r => r.aA === depAge) : null;
  const floorAtDep = depRow ? Math.round(depRow.ssA + depRow.ssB + depRow.pens + depRow.rent) : 0;
  const needAtDep = depRow ? Math.round(depRow.need) : 0;

  const compTip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const row = payload[0].payload;
    return (<div style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:8, padding:"8px 10px", fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>
      <div style={{ fontWeight:600, marginBottom:4 }}>You {label} · Spouse {row.ageB}</div>
      {payload.filter(p=>p.value>0 && p.dataKey!=="need").map(p=>(
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:14, color:p.color }}><span>{p.name}</span><span>{usd0(p.value)}</span></div>
      ))}
      <div style={{ borderTop:`1px solid ${C.line}`, marginTop:4, paddingTop:3, color:C.clay }}>need&nbsp;{usd0(row.need)}</div>
    </div>);
  };

  return (
    <div style={{ background:C.paper, minHeight:"100%", color:C.ink, fontFamily:"'Inter', system-ui, sans-serif", WebkitFontSmoothing:"antialiased", paddingBottom:40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        input[type=number]::-webkit-inner-spin-button { opacity:.25; }
        .rc-grid { display:grid; grid-template-columns:1fr; gap:0; }
        @media (min-width:980px){ .rc-grid { grid-template-columns:430px 1fr; column-gap:28px; } }
        .rc-inputs { display:grid; grid-template-columns:1fr 1fr; gap:0 14px; }
        .rc-yby-grid { grid-template-columns:1fr; }
        @media (min-width:620px){ .rc-yby-grid { grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); } }
        .rc-stat { animation:rise .5s ease both; }
        @keyframes rise { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
        @media (prefers-reduced-motion:reduce){ .rc-stat,.rc-exp{ animation:none; transition:none; } }
        .rc-loc:hover { background:#F6F2E8; }
        .rc-loc:focus-visible { outline:2px solid ${C.brass}; outline-offset:2px; }
        .rc-exp { animation:exp .25s ease both; }
        @keyframes exp { from{opacity:0;} to{opacity:1;} }
      `}</style>

      <header ref={headerRef} style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, background:C.ink, color:"#F4F1E8", padding: headerCollapsed ? "9px 22px" : "30px 22px 26px" }}>
        <div style={{ maxWidth:1160, margin:"0 auto", display:"flex", alignItems:"center", gap:16 }}>
          <NestLogo size={headerCollapsed ? 34 : 46} />
          <div style={{ flex:1, minWidth:0 }}>
            {!headerCollapsed &&
              <div style={{ fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:C.brass, fontWeight:700 }}>Retirement planner · 2026 figures</div>}
            <h1 style={{ fontFamily:"'Newsreader', serif", fontWeight:400, fontSize: headerCollapsed ? 21 : 34, lineHeight:1.1, margin: headerCollapsed ? 0 : "8px 0 10px", letterSpacing:-.5 }}>Nest &amp; Next</h1>
            {!headerCollapsed && <>
              <p style={{ margin:"0 0 8px", maxWidth:680, fontSize:16, lineHeight:1.45, color:"#F4F1E8" }}>
                This is about your money, your home, and what comes next.
              </p>
              <p style={{ margin:0, maxWidth:680, fontSize:14.5, lineHeight:1.55, color:"#C9D3CF" }}>
                Every income stream mapped year by year — salaries, two Social Security checks, the spouse's Washington
                pension, two inherited homes — against the cost of living from Sofia to the Bahamas, with the
                pre-Medicare healthcare gap and cross-border inheritance taxes built in.
              </p>
            </>}
          </div>
          <button onClick={() => setHeaderCollapsed(c => !c)}
            aria-label={headerCollapsed ? "Expand header" : "Collapse header"} aria-expanded={!headerCollapsed}
            style={{ flexShrink:0, alignSelf: headerCollapsed ? "center" : "flex-start", display:"inline-flex", alignItems:"center",
              justifyContent:"center", width:34, height:34, padding:0, cursor:"pointer", color:"#F4F1E8",
              background:"rgba(244,241,232,.08)", border:`1px solid ${C.inkSoft}`, borderRadius:8 }}>
            <Chevron up={!headerCollapsed} />
          </button>
        </div>
      </header>

      <div style={{ maxWidth:1160, margin:"0 auto", padding:"24px 22px 60px", paddingTop:headerH + 24 }}>
        <div className="rc-grid">
          {/* INPUTS */}
          <div>
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"20px 20px 6px", marginBottom:18 }}>
              <Household s={s} set={set} deferredMode={deferredMode} onDeferredModeChange={setDeferredMode} incomeHH={incomeHH} />
              <Timing s={s} set={set} sFull={sFull} />
              <Pension s={s} set={set} afcAuto={afcAuto} afcEff={afcEff} steady={steady} />
              <InheritanceStep s={s} set={set} setProp={setProp} />
              <Milestones s={s} set={set} addEvent={addEvent} removeEvent={removeEvent} />
              <TravelLongevity s={s} set={set} />
              <Advanced s={s} set={set} adv={adv} onAdvToggle={() => setAdv(a => !a)} />
            </div>
          </div>

          {/* RESULTS */}
          <div>
            <Headline steady={steady} s={s} mc={mc} onTrack={onTrack} effHaircut={effHaircut} effCutYear={effCutYear} />
            <Stats steady={steady} simSS={simSS} simNo={simNo} horizon={horizon} swr={s.swr} />
            <RiskTable sFull={sFull} sTrust={sTrust} sNone={sNone} simFull={simFull} simTrust={simTrust} simNone={simNone} s={s} effHaircut={effHaircut} horizon={horizon} />
            <InheritanceResult s={s} setProp={setProp} />

            {/* Staircase (healthcare-aware) */}
            <Staircase
              compRows={compRows}
              depAge={simSS.depAge}
              floorAtDep={floorAtDep}
              needAtDep={needAtDep}
              hasRental={hasRental}
              pensionOn={s.pensionOn}
              spendBasis={s.spendBasis}
              retireLoc={s.retireLoc}
              onRetireLocChange={set("retireLoc")}
              ageA={s.ageA}
              onYbyOpen={setYbyOpen}
              onSelectYear={setSelYear}
              compTip={compTip}
            />

            {/* Year by year — a typical month (or full year) for the selected year */}
            <YearByYear
              rows={simSS.rows}
              depAge={depAge}
              inputs={s}
              selYear={selYear}
              onYearChange={setSelYear}
              playing={playing}
              onSetPlaying={setPlaying}
              view={ybyView}
              onViewChange={setYbyView}
              open={ybyOpen}
              onToggleOpen={() => setYbyOpen(o => !o)}
            />

            {/* Inside the portfolio — flows + tax buckets */}
            <PortfolioFlows
              invRows={invRows}
              firstRmdAge={firstRmdAge}
              view={invView}
              onViewChange={setInvView}
            />

            {/* Balance with vs without SS */}
            <LongRun
              balRows={balRows}
              sellDots={sellDots}
              mc={mc}
              mcRunning={mcRunning}
              onRunMc={runMc}
              horizon={horizon}
              ssMode={s.ssMode}
              effHaircut={effHaircut}
              mcSummaryLines={mcSummaryLines}
            />

            {/* Places */}
            <Places
              locRows={locRows}
              steadyNet={steady.net}
              couple={couple}
              onCoupleChange={setCouple}
              stage={stage}
              onStageChange={setStage}
              openLoc={openLoc}
              onToggle={setOpenLoc}
              sFactor={sFactor}
              retYear={retYear}
              inflFactor={inflFactor}
              inflation={s.inflation}
              yearsToRet={yearsToRet}
            />

            {/* Compare */}
            <Compare
              cmpA={cmpA}
              cmpB={cmpB}
              onPickA={setCmpA}
              onPickB={setCmpB}
              stage={stage}
              couple={couple}
              sFactor={sFactor}
              steadyNet={steady.net}
              inflFactor={inflFactor}
              retYear={retYear}
            />

            {/* Income mix */}
            <IncomeMix
              incomeStack={incomeStack}
              steadyGross={steady.gross}
            />

            {/* Notes */}
            <div style={{ background:"#F6F4EC", border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px" }}>
              <h3 style={{ margin:"0 0 10px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:18, color:C.ink }}>Planner's notes</h3>
              {[
                ["Texas: sell or rent, don't just hold.","The US basis step-up wipes out capital-gains tax on a near-term sale, and Texas has no estate/inheritance/income tax — so selling nets ~93% of value, free to invest. Renting yields ~3.5% net. Living in it saves little because Texas property tax (~1.7%/yr) roughly equals the rent you'd avoid."],
                ["Klagenfurt: living in it is the prize.","Austria charges no inheritance tax but ~1.85% to transfer, and a sale later is taxed 30% (or 4.2% of price if pre-2002) with no step-up — a tax the US foreign credit usually can't offset. But property tax is tiny, so living there replaces ~$1,650/mo of rent for ~$300, and a 5-of-10-year primary-residence history can exempt a future sale entirely."],
                ["Social Security is a risk you can size, not a coin flip.","Current law projects a ~19–23% shortfall around 2033–34 if Congress does nothing, not a shutoff — and lawmakers have always acted before. The funding control lets you stress-test it; because the spouse's pension and your savings carry most of the load, even the 81% case leaves you close to plan. Delaying a claim to 70 also hardens the survivor's check against any cut."],
                ["The pre-65 healthcare cliff is now in the timeline.","The dashed need line rises before 65 by the full-price ACA premium for your chosen retirement spot, then drops at Medicare age. Pick a US location and the bridge years cost ~$17k/yr more; pick Europe and it barely moves. Keeping taxable income modest in those years can unlock ACA subsidies."],
                ["File the paperwork.","A foreign inheritance over $100k needs IRS Form 3520 (reporting only, but steep penalties if missed), plus FBAR/FATCA if you hold foreign accounts. None of these are taxes — just disclosures."],
                ["Cross-border tax is treaty territory.","The US taxes you on worldwide income and gains; the US–Austria income and estate-tax treaties plus the foreign tax credit are what prevent double taxation. This is the one area to run past a cross-border specialist before acting."],
              ].map((n,idx,arr)=>(
                <div key={idx} style={{ display:"flex", gap:10, marginBottom:idx<arr.length-1?11:0 }}>
                  <span style={{ flexShrink:0, width:6, height:6, borderRadius:99, background:C.brass, marginTop:6 }} />
                  <div style={{ fontSize:13, lineHeight:1.5, color:C.inkSoft }}><b style={{ color:C.ink }}>{n[0]}</b> {n[1]}</div>
                </div>
              ))}
            </div>

            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"14px 18px", marginTop:16 }}>
              <h3 style={{ margin:"0 0 8px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:18, color:C.ink }}>Source links</h3>
              <p style={{ margin:"0 0 10px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>
                These are the main public sources behind the formulas. They are here so you can check the numbers yourself.
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"7px 12px", fontSize:12.5 }}>
                {[
                  ["IRS 2026 tax rules", SOURCES.irs2026],
                  ["SSA benefit formula", SOURCES.ssaPia],
                  ["SSA wage base", SOURCES.ssaWageBase],
                  ["SSA spouse benefits", SOURCES.ssaRetirement],
                  ["SSA trust funds", SOURCES.ssaTrustees],
                  ["WA DRS pension", SOURCES.drsTrs2],
                  ["KFF ACA premiums", SOURCES.kffAca],
                  ["CMS Medicare", SOURCES.cmsMedicare],
                ].map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" style={{ color:C.brassDeep, fontWeight:700 }}>{label}</a>
                ))}
              </div>
            </div>

            <p style={{ fontSize:11, color:C.mut, lineHeight:1.5, marginTop:16 }}>
              Estimates for planning only — not financial, tax, or legal advice. Figures are in today's dollars; breakdowns also show a
              future-dollar equivalent. Inheritance outcomes use simplified net factors (Texas ~93% on sale via basis step-up; Austria ~90%
              after transfer + capital-gains tax) and assume the estate stays under the $15M federal exemption — confirm the decedent's
              acquisition history, currency basis, and treaty treatment with a cross-border tax professional. 2026 federal brackets. Inherited-home live-in savings begin the year after inheritance; one-time relocation costs are not modeled.
              {!s.ltc.on && " Long-term care is not modeled (about 70% of retirees need it; roughly $50k–$200k/yr depending on location) — enable it under Step Five → Advanced to stress-test."}
            </p>
          </div>
        </div>
      </div>

      <footer style={{ position:"fixed", left:0, right:0, bottom:0, zIndex:50, background:C.ink, color:C.paper,
        display:"flex", justifyContent:"center", alignItems:"center", gap:10, flexWrap:"wrap",
        padding:"7px 16px", fontSize:11, letterSpacing:0.3, borderTop:`1px solid ${C.inkSoft}` }}>
        <span>Nest &amp; Next · v{import.meta.env.VITE_APP_VERSION}</span>
        <span style={{ color:C.mut }}>·</span>
        <span>Chris Phillipson</span>
      </footer>
    </div>
  );
}
