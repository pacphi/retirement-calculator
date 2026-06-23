import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { makeDefaultPlan } from "./src/defaultPlan.js";
import { C } from "./src/components/theme.js";
import { Chevron, NestLogo } from "./src/components/atoms/index.jsx";
import { afcIsAuto, resolveAfc } from "./src/calculatorCore.js";
import { Headline } from "./src/components/results/Headline.jsx";
import { usePlan } from "./src/hooks/usePlan.js";
import { useMonteCarlo } from "./src/hooks/useMonteCarlo.js";
import { usd0 } from "./src/components/format.js";
import { useWizardNav } from "./src/nav/useWizardNav.js";
import { WizardShell } from "./src/nav/WizardShell.jsx";
import { ReportShell } from "./src/nav/ReportShell.jsx";
import { buildSteps } from "./src/nav/stepRegistry.jsx";
import { buildReportSections } from "./src/nav/reportRegistry.jsx";
import { useReportExport } from "./src/report/useReportExport.js";
import { ReportDocument } from "./src/report/ReportDocument.jsx";

/* ------------------------ Format + tiers ------------------------ */

export const mcSummaryLines = (mc, horizon = 95) => mc ? [
  `Success probability: ${Math.round(mc.successProb * 100)}%`,
  `Median sustainable income: ${mc.sustainableIncome.p50.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0})}`,
  `Worst-case (10th pct) savings run out at age: ${mc.depletionAge.p10 > horizon ? `beyond ${horizon}` : mc.depletionAge.p10}`,
] : [];

/* ---------------------------- Main ---------------------------- */
export default function RetirementCalculator() {
  const [s, setS] = useState(makeDefaultPlan);
  const [couple, setCouple] = useState(true);
  const [stage, setStage] = useState("post");
  const [deferredMode, setDeferredMode] = useState("pct"); // "pct" | "amt" -- view for the pre-tax share
  const [invView, setInvView] = useState("flow"); // "flow" | "buckets" | "bucketsRmd" -- investments chart view
  const [selYear, setSelYear] = useState(null); // selected calendar year for the year-by-year navigator (null -> default)
  const [playing, setPlaying] = useState(false); // auto-advance the year navigator
  const [ybyView, setYbyView] = useState("month"); // "month" (annual ÷ 12) | "year" (annual totals)
  const [ybyOpen, setYbyOpen] = useState(true); // collapse the year-by-year section
  const [openLoc, setOpenLoc] = useState("Austria");
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
    set("events")([...s.events, { id, label: "New milestone", on: true, year: 2040, amount: 10000, type: "gift", emergent: false }]);
  };
  const removeEvent = (idx) => set("events")(s.events.filter((_, i) => i !== idx));

  const lifeSeq = useRef(0);
  const addLifestyleStep = () =>
    set("lifestyleSteps")([...(s.lifestyleSteps || []), { id: `ls-${lifeSeq.current++}`, fromYear: 2040, deltaAnnual: 12000, on: true }]);
  const removeLifestyleStep = (idx) => set("lifestyleSteps")((s.lifestyleSteps || []).filter((_, i) => i !== idx));
  const setLifestyleStep = (idx, field) => (v) =>
    set("lifestyleSteps")((s.lifestyleSteps || []).map((st, i) => (i === idx ? { ...st, [field]: v } : st)));

  // Plan derivation (calc + all downstream memos)
  const {
    incomeHH, inher,
    simFull, simTrust, simNone,
    steady, sFull, sTrust, sNone,
    effHaircut, effCutYear,
    simSS, simNo,
    locRows, compRows, balRows, invRows, incomeStack,
    sFactor,
    headroom,
    accumulation,
    hasEmergent,
    retireHousingAnnual,
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

  // Everything the step + report registries need, in one bag. The registries close over
  // this to render the existing step/result/chart components unchanged.
  const ctx = {
    s, set, setProp,
    deferredMode, setDeferredMode,
    incomeHH, retireHousingAnnual, sFull, sTrust, sNone,
    afcAuto, afcEff, steady,
    addEvent, removeEvent, addLifestyleStep, removeLifestyleStep, setLifestyleStep,
    // report-derived
    mc, mcRunning, runMc, mcSummaryLines,
    onTrack, effHaircut, effCutYear, headroom, horizon,
    simSS, simNo, simFull, simTrust, simNone,
    yearsToRet, accumulation, retYear, inflFactor,
    compRows, floorAtDep, needAtDep, hasRental, depAge,
    selYear, setSelYear, playing, setPlaying, ybyView, setYbyView, ybyOpen, setYbyOpen,
    compTip, invRows, firstRmdAge, invView, setInvView,
    balRows, sellDots, hasEmergent,
    locRows, couple, setCouple, stage, setStage, openLoc, setOpenLoc, sFactor,
    cmpA, cmpB, setCmpA, setCmpB, incomeStack,
  };

  const steps = buildSteps(ctx);
  const sections = buildReportSections(ctx);
  // A print-only variant where charts render at a fixed pixel width (no responsive measuring),
  // so the printed/PDF report lays out cleanly without overlapping or clipping.
  const printSections = buildReportSections({ ...ctx, printWidth: 660 });
  const nav = useWizardNav(steps.map((st) => st.id), sections.map((sec) => sec.id));

  const verdict = (
    <Headline steady={steady} s={s} mc={mc} onTrack={onTrack} effHaircut={effHaircut} effCutYear={effCutYear} />
  );
  const { reportRef, printing, print } = useReportExport();

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
        /* Print: the print-only report (portaled to <body id="nn-print">) is hidden on screen
           and revealed only for print, where it replaces the interactive app entirely. */
        #nn-print { display:none; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        @media print {
          body > *:not(#nn-print) { display:none !important; }
          #nn-print { display:block !important; }
          #nn-print, #nn-print * { overflow:visible !important; }
          #nn-print .rc-stat { animation:none !important; }
          #nn-print .rc-yby-grid { grid-template-columns:1fr !important; }
          /* Compact, continuous flow: sections run on from each other (no forced page break),
             breaking only where a page fills. .report-keep groups each section heading with its
             first panel so the heading is never stranded at a page bottom; every panel stays
             intact so a chart never splits from its heading. Panels taller than a page still
             break (the browser overrides break-inside:avoid when it cannot fit). */
          #nn-print .report-block, #nn-print .report-keep, #nn-print .rc-stat, #nn-print table, #nn-print svg { break-inside:avoid; }
          #nn-print .report-section > * { break-inside:avoid; }
          #nn-print h3 { break-after:avoid; }
          @page { margin:14mm; }
        }
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
        {nav.mode === "wizard"
          ? <WizardShell steps={steps} nav={nav} />
          : <ReportShell sections={sections} nav={nav} pinnedVerdict={verdict} onPrint={print} />}
      </div>

      {/* Print-only render of the FULL report (verdict + every section), portaled to <body> so
          @media print can hide the app and show just this. Charts use fixed widths so they don't
          overlap or clip. Mounted only while printing. */}
      {printing && createPortal(
        <div id="nn-print" ref={reportRef}>
          <ReportDocument verdict={verdict} sections={printSections} />
        </div>,
        document.body,
      )}

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
