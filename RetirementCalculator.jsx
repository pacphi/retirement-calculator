import { useState, useMemo, useRef, useEffect } from "react";
import {
  ComposedChart, Area, Line, LineChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, ReferenceLine,
} from "recharts";
import { DEFAULT_LIFE, DEFAULT_LIFE_EVENTS, DEFAULT_TRAVEL, LOCATIONS, MC_DEFAULTS, PROP, SINGLE_COST_FACTOR, SOURCES } from "./src/retirementData.js";
import { C, SRC, FONTS } from "./src/components/theme.js";
import { Field, NumberInput, Select, Segmented, Section, AssumptionIcon, Chevron, NestLogo } from "./src/components/atoms/index.jsx";
import {
  afcIsAuto,
  resolveAfc,
  calculatePlan,
  monthlyTotal,
  ownBenefitAtClaimMonthly,
  proratedFraEstimate,
  propEcon,
  tierFor,
} from "./src/calculatorCore.js";
import { Staircase } from "./src/components/charts/Staircase.jsx";
import { YearByYear } from "./src/components/charts/YearByYear.jsx";
import { PortfolioFlows } from "./src/components/charts/PortfolioFlows.jsx";
import { LongRun } from "./src/components/charts/LongRun.jsx";
import { Places } from "./src/components/charts/Places.jsx";
import { Compare } from "./src/components/charts/Compare.jsx";
import { IncomeMix } from "./src/components/charts/IncomeMix.jsx";

const SSA_FRA_URL = "https://secure.ssa.gov/myssa/bec-plan-prep-ui/bec-home";

/* ------------------------ Format + tiers ------------------------ */
const usd0 = (x) => (x<0?"-$":"$") + Math.abs(Math.round(x)).toLocaleString();
const usdK = (x) => Math.abs(x) >= 1000 ? "$" + Math.round(x/1000) + "k" : "$" + Math.round(x);

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
  const [mc, setMc] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);
  const workerRef = useRef(null);

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

  useEffect(() => {
    workerRef.current = new Worker(new URL("./src/finance/mcWorker.js", import.meta.url), { type: "module" });
    workerRef.current.onmessage = (e) => {
      if (e.data?.type === "mc-result") { setMc(e.data.result); setMcRunning(false); }
    };
    return () => workerRef.current && workerRef.current.terminate();
  }, []);

  const runMc = () => {
    setMcRunning(true);
    setMc(null);
    workerRef.current.postMessage({ state: s, mcOpt: MC_DEFAULTS });
  };

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

  const calc = useMemo(() => calculatePlan(s), [s]);
  const afcAuto = afcIsAuto(s);
  const afcEff = resolveAfc(s);

  const { incomeHH, inher, simChosen, simFull, simTrust, simNone, simStress, steady, sFull, sTrust, sNone, effHaircut, effCutYear } = calc;
  const simSS = simChosen, simNo = simNone;

  const onTrack = steady.net >= steady.targetNeed;
  const horizon = Number(s.horizonAge) || 95;
  const lastsTxt = (d) => d ? `age ${d}` : `beyond ${horizon}`;
  const sFactor = couple ? 1 : SINGLE_COST_FACTOR;
  const yearsToRet = Math.max(0, steady.startAgeA - s.ageA);
  const retYear = 2026 + yearsToRet;
  const inflFactor = Math.pow(1 + s.inflation, yearsToRet);
  const annualCost = (l) => monthlyTotal(l, stage) * 12 * sFactor;

  const locRows = useMemo(() => LOCATIONS.map(l => {
    const cost = annualCost(l); const ratio = steady.net / cost;
    return { ...l, cost, ratio, tier: tierFor(ratio) };
  }).sort((a,b)=>a.cost-b.cost), [steady.net, sFactor, stage]);

  const firstEvent = Math.min(s.stopA, s.stopB + (s.ageA - s.ageB));
  const compRows = simSS.rows.filter(r => r.aA >= firstEvent-2).map(r => ({
    age:r.aA, ageB:r.aB, "Salary (you)":Math.round(r.salA), "Salary (spouse)":Math.round(r.salB),
    "Rental":Math.round(r.rent), "Pension":Math.round(r.pens), "SS (you)":Math.round(r.ssA),
    "SS (spouse)":Math.round(r.ssB), "Portfolio":(r.wdSpend ?? r.wd), need:r.need, extraSpend:r.extraSpend || 0,
  }));
  const balRows = simSS.rows.map((r, idx) => ({
    age:r.aA,
    withSS:r.bal,
    withoutSS: simNo.rows[idx] ? simNo.rows[idx].bal : 0,
    stress: simStress.rows[idx] ? simStress.rows[idx].bal : 0,
  }));
  const sellDots = simSS.rows.filter(r => r.sellLump > 0).map(r => ({ age:r.aA, bal:r.bal }));
  const hasRental = inher.some(p => p.type === "rent");

  // Inside-the-portfolio dataset: the tax-deferred bucket vs the after-tax bucket,
  // and the yearly money flows (in = contributions + growth, out = spending draw +
  // forced RMD). Out-flows are negative so they read below the zero line.
  const invRows = simSS.rows.map(r => ({
    age: r.aA,
    deferred: r.defBal ?? 0,
    afterTax: Math.max(0, r.bal - (r.defBal ?? 0)),
    contrib: r.contrib || 0,
    growth: Math.max(0, r.growth || 0),
    spendDraw: -(r.wdSpend ?? r.wd ?? 0),
    forcedRmd: -(r.forcedRmd || 0),
    rmd: r.rmd || 0,
  }));
  const firstRmdAge = (simSS.rows.find(r => (r.forcedRmd || 0) > 0) || {}).aA ?? null;

  // Depletion: the age the portfolio runs out (if it does) and the guaranteed
  // income floor — SS + pension + rental — the household lives on afterward.
  const depAge = simSS.depAge;
  const depRow = depAge != null ? simSS.rows.find(r => r.aA === depAge) : null;
  const floorAtDep = depRow ? Math.round(depRow.ssA + depRow.ssB + depRow.pens + depRow.rent) : 0;
  const needAtDep = depRow ? Math.round(depRow.need) : 0;

  const incomeStack = [
    { name:"Savings draw", value: Math.round(steady.wd), color:C.brass },
    ...(steady.rentInc>0 ? [{ name:"Rental", value: Math.round(steady.rentInc), color:SRC.rent }] : []),
    { name:"Social Security", value: Math.round(steady.ssHouse), color:C.viridian },
    ...(s.pensionOn ? [{ name:"WA pension", value: Math.round(steady.pension), color:C.ink }] : []),
  ];

  const locByName = (n) => LOCATIONS.find(l => l.name === n);

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

  const PropCard = ({ keyName }) => {
    const p = s[keyName], meta = PROP[keyName], e = propEcon(keyName, Number(p.value)||0);
    const opts = [["sell","Sell","sell"],["rent","Rent out","rent"],["live","Live in","live"]];
    const chosen = p.strategy;
    return (
      <div style={{ border:`1px solid ${C.line}`, borderRadius:12, padding:"14px 15px", marginBottom:12, background:"#FCFAF4" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
          <h4 style={{ margin:0, fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:17, color:C.ink }}>{meta.label}</h4>
          <span style={{ fontSize:11, color:C.mut }}>arrives {p.year}</span>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {opts.map(([v,lab])=>{
            const on=chosen===v; const num = v==="sell"?e.sell : v==="rent"?e.rent : e.live;
            const unit = v==="sell"?"net":"/yr";
            return (
              <button key={v} onClick={()=>setProp(keyName,"strategy")(v)} style={{ flex:1, textAlign:"left", border:`1.5px solid ${on?C.brass:C.line}`, background:on?"#fff":"transparent", borderRadius:9, padding:"9px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:on?C.brassDeep:C.slate, marginBottom:3 }}>{lab}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color: num<0?C.clay:C.ink }}>{usd0(num)}<span style={{ fontSize:10, color:C.mut, fontWeight:400 }}>{unit}</span></div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize:11.5, color:C.slate, lineHeight:1.5, background:"#F1EEE5", borderRadius:8, padding:"8px 10px" }}>
          <b style={{ color:C.ink }}>{chosen==="sell"?"If sold:":chosen==="rent"?"If rented:":"If you live in it:"}</b> {meta.notes[chosen]}
        </div>
      </div>
    );
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
              <Section eyebrow="Step one" title="Your household, today">
                <div className="rc-inputs">
                  <Field label="Your age now"><NumberInput value={s.ageA} onChange={set("ageA")} /></Field>
                  <Field label="Spouse age now"><NumberInput value={s.ageB} onChange={set("ageB")} /></Field>
                  <Field label="Your annual income"><NumberInput value={s.incomeA} onChange={set("incomeA")} prefix="$" /></Field>
                  <Field label="Spouse income" hint="Spouse's teaching salary."><NumberInput value={s.incomeB} onChange={set("incomeB")} prefix="$" /></Field>
                  <Field label="Combined savings now"><NumberInput value={s.savings} onChange={set("savings")} prefix="$" /></Field>
                  <Field label="Saved per year" hint="Stops as each of you retires."><NumberInput value={s.contrib} onChange={set("contrib")} prefix="$" /></Field>
                </div>
                <div style={{ display:"flex", marginBottom:8 }}>
                  <Segmented value={deferredMode} onChange={setDeferredMode}
                    options={[{label:"% of savings",value:"pct"},{label:"$ amount",value:"amt"}]} />
                </div>
                <Field
                  label={`Pre-tax 401(k)/IRA share of savings — ${Math.round(s.tradFrac*100)}%`}
                  hint="Portion of combined savings in pre-tax 401(k)/IRA/403(b). RMDs apply to this starting at age 75; the rest is treated as Roth/after-tax. The plan takes each RMD on schedule, so no penalty applies — a missed RMD is taxed at 25% (10% if fixed within 2 years).">
                  {deferredMode==="pct"
                    ? <input type="range" min={0} max={100} step={10} value={s.tradFrac*100} onChange={(e)=>set("tradFrac")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} />
                    : <NumberInput value={Math.round(s.tradFrac*(Number(s.savings)||0))} prefix="$" min={0}
                        onChange={(v)=>{ const sav=Number(s.savings)||0; const amt=Number(v)||0; set("tradFrac")(sav>0 ? Math.min(1, Math.max(0, amt/sav)) : 0); }} />}
                </Field>
                <Field label="Filing status"><Segmented value={s.status} onChange={set("status")} options={[{label:"Married",value:"married"},{label:"Single",value:"single"}]} /></Field>
                <div style={{ marginBottom:14 }}>
                  <span style={{ display:"block", fontSize:12.5, fontWeight:600, color:C.ink, marginBottom:5 }}>Spending basis</span>
                  <Segmented value={s.spendBasis} onChange={set("spendBasis")} options={[{label:"% of income",value:"income"},{label:"Location cost",value:"location"}]} />
                  <span style={{ display:"block", fontSize:11, color:C.mut, marginTop:4, lineHeight:1.4 }}>Estimate retirement spending as a share of income, or from the cost of living where you'll retire.</span>
                </div>
                {s.spendBasis === "income" ? (
                  <Field label={`Retire on this share of income — ${Math.round(s.targetPct*100)}%`} hint={`Base spending goal: ${usd0(incomeHH*s.targetPct)}/yr. The timeline adds the pre-65 healthcare gap on top.`}>
                    <input type="range" min={20} max={80} step={5} value={s.targetPct*100} onChange={(e)=>set("targetPct")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} />
                  </Field>
                ) : (() => {
                  const l = LOCATIONS.find(x => x.name === s.retireLoc) || LOCATIONS[0];
                  const life = (Number(s.lifestyle) || 100) / 100;
                  const livingMo = Object.values(l.m).reduce((a, b) => a + b, 0) * life;
                  const yr65 = Math.round((livingMo + l.hcPost) * 12);
                  const yrPre = Math.round((livingMo + l.hcPre) * 12);
                  return (
                    <>
                      <Field label="Cost-of-living basis" hint="Where you'll retire — sets the spending baseline and healthcare. (Same selector as on the timeline.)">
                        <Select value={s.retireLoc} onChange={set("retireLoc")} options={LOCATIONS.map(x => x.name)} />
                      </Field>
                      <Field label={`Lifestyle — ${s.lifestyle}% of ${s.retireLoc} cost of living`} hint={`Spending here: about ${usd0(yr65)}/yr at 65+ (${usd0(yrPre)}/yr before Medicare, full-price healthcare). Lifestyle scales living costs; healthcare is applied by age.`}>
                        <input type="range" min={70} max={150} step={5} value={s.lifestyle} onChange={(e)=>set("lifestyle")(Number(e.target.value))} style={{ width:"100%", accentColor:C.brass }} />
                      </Field>
                    </>
                  );
                })()}
              </Section>

              <Section eyebrow="Step two" title="When work stops & benefits begin">
                <div className="rc-inputs">
                  <Field label="You stop working at"><NumberInput value={s.stopA} onChange={set("stopA")} /></Field>
                  <Field label="Spouse stops at"><NumberInput value={s.stopB} onChange={set("stopB")} /></Field>
                  <Field label="Your SS claim age" hint="62–70. +8%/yr to delay."><NumberInput value={s.claimA} onChange={set("claimA")} min={62} /></Field>
                  <Field label="Spouse SS claim age"><NumberInput value={s.claimB} onChange={set("claimB")} min={62} /></Field>
                </div>
                <Field label="Your SS estimate source" hint="SSA statement is best. Income estimate is only a fallback.">
                  <Segmented value={s.ssModeA} onChange={set("ssModeA")} options={[{label:"Income estimate",value:"estimate"},{label:"SSA statement",value:"statement"}]} />
                </Field>
                <Field label="Spouse SS estimate source">
                  <Segmented value={s.ssModeB} onChange={set("ssModeB")} options={[{label:"Income estimate",value:"estimate"},{label:"SSA statement",value:"statement"}]} />
                </Field>
                {(s.ssModeA==="estimate" || s.ssModeB==="estimate") && (
                  <div role="note" style={{ fontSize:12, color:C.clay, background:"#FBEFEC", border:`1px solid ${C.clay}40`, borderRadius:8, padding:"9px 11px", lineHeight:1.5, marginTop:8 }}>
                    ⚠ The income estimate assumes a full 35-year Social Security career. It <b>overstates</b> the benefit for a shorter covered career and <b>understates</b> it for anyone not currently earning. Prefer your SSA statement.
                  </div>
                )}
                {(s.ssModeA==="statement" || s.ssModeB==="statement") && (
                  <>
                    <div style={{ fontSize:12, color:C.slate, marginTop:8, lineHeight:1.5 }}>
                      Enter your <b>age-67 (full retirement age) monthly amount × 12</b>, from{" "}
                      <a href={SSA_FRA_URL} target="_blank" rel="noreferrer" style={{ color:C.brassDeep, fontWeight:600 }}>ssa.gov → my Social Security</a>. Your claim age below adjusts it (62 ≈ −30%, 70 ≈ +24%).
                    </div>
                    <div className="rc-inputs">
                      {s.ssModeA==="statement" && (
                        <Field label="Your FRA benefit (age 67)" hint={`At your claim age (${s.claimA}): ${usd0(ownBenefitAtClaimMonthly((Number(s.ssFraA)||0)/12, s.claimA))}/mo`}>
                          <NumberInput value={s.ssFraA} onChange={set("ssFraA")} prefix="$" suffix="/yr" />
                        </Field>
                      )}
                      {s.ssModeB==="statement" && (
                        <Field label="Spouse FRA benefit (age 67)" hint={`At the spouse's claim age (${s.claimB}): ${usd0(ownBenefitAtClaimMonthly((Number(s.ssFraB)||0)/12, s.claimB))}/mo · suggested from ${s.pYears} covered yrs: ${usd0(proratedFraEstimate(Number(s.incomeB)||0, s.pYears))}/yr`}>
                          <NumberInput value={s.ssFraB} onChange={set("ssFraB")} prefix="$" suffix="/yr" />
                        </Field>
                      )}
                    </div>
                  </>
                )}
                <div style={{ fontSize:12, color:C.slate, background:"#F6F4EC", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
                  Scheduled benefits: your SS <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(sFull.ssA)}</b>, spouse SS <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(sFull.ssB)}</b>/yr at full funding. The income estimate uses SSA bend points; your SSA statement is usually more reliable.
                </div>
                <div style={{ marginTop:14 }}>
                  <Field label="Social Security funding scenario" hint="The 2025 Trustees project the retirement fund runs short ~2033–34; after that, payroll taxes still cover ~77–81% of benefits unless Congress acts.">
                    <Segmented value={s.ssMode} onChange={set("ssMode")} options={[{label:"Congress acts · 100%",value:"full"},{label:"Trustees · 81%",value:"trustees"},{label:"Custom",value:"custom"}]} />
                  </Field>
                  {s.ssMode==="custom" && (
                    <div className="rc-inputs">
                      <Field label={`Benefits payable — ${s.ssHaircut}%`}>
                        <input type="range" min={0} max={100} step={1} value={s.ssHaircut} onChange={(e)=>set("ssHaircut")(Number(e.target.value))} style={{ width:"100%", accentColor:C.brass }} />
                      </Field>
                      <Field label="Reduction starts"><NumberInput value={s.ssCutYear} onChange={set("ssCutYear")} /></Field>
                    </div>
                  )}
                  {s.ssMode==="trustees" && (
                    <Field label="Reduction starts" hint="2034 = combined funds; 2033 = retirement fund alone.">
                      <NumberInput value={s.ssCutYear} onChange={set("ssCutYear")} />
                    </Field>
                  )}
                </div>
              </Section>

              <Section eyebrow="Step three" title="Spouse's Washington State pension">
                <Field label="Include the DRS pension"><Segmented value={s.pensionOn} onChange={set("pensionOn")} options={[{label:"Include",value:true},{label:"Skip",value:false}]} /></Field>
                {s.pensionOn && (<>
                  <div className="rc-inputs">
                    <Field label="System" hint="TRS and SERS use the same formula here."><Segmented value={s.system} onChange={set("system")} options={[{label:"TRS",value:"TRS"},{label:"SERS",value:"SERS"}]} /></Field>
                    <Field label="Plan" hint="Plan 2 = 2%/yr · Plan 3 = 1%/yr."><Segmented value={s.plan} onChange={set("plan")} options={[{label:"Plan 2",value:2},{label:"Plan 3",value:3}]} /></Field>
                    <Field label="Years of service"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
                    <Field label="Pension starts at" hint="Before 65 it's reduced."><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
                  </div>
                  <Field
                    label={<>Average final compensation (AFC){afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no AFC was entered. Wages are held flat in real terms, so today's salary stands in for final-average pay. Type a value to override." />}</>}
                    hint="Avg pay over the spouse's highest 60 consecutive months."
                  >
                    <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
                    {afcAuto
                      ? <span style={{ display:"block", fontSize:11, color:C.brassDeep, marginTop:5, lineHeight:1.4 }}>Assumed from the spouse's income ({usd0(Number(s.incomeB)||0)}) — wages are held flat in real terms, so this is a placeholder. Type a value to override.</span>
                      : <span onClick={()=>set("afc")(null)} style={{ display:"inline-block", fontSize:11, color:C.brassDeep, marginTop:5, cursor:"pointer", textDecoration:"underline" }}>Reset to assumed (spouse's income)</span>}
                  </Field>
                  <div style={{ fontSize:12, color:C.slate, background:"#F6F4EC", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
                    DRS calculates the monthly benefit from monthly AFC; this app annualizes the same formula. {s.plan===2?"2%":"1%"} x {s.pYears} x {usd0(afcEff)}{steady.erf!=null&&steady.erf<1?` x ${steady.erf.toFixed(4)} early factor`:""} = <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote || (steady.erf!=null&&steady.erf<1?"Early retirement uses the current DRS factor table.":"")}
                  </div>
                </>)}
              </Section>

              <Section eyebrow="Step four" title="Inherited real estate">
                <div style={{ fontSize:12, color:C.slate, lineHeight:1.5, marginBottom:14 }}>Two homes you may inherit. Set the value, the year, and what you'd do with each — the tax math and the impact on your plan update live.</div>
                {["tx","at"].map(key => {
                  const p = s[key];
                  return (
                    <div key={key} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, color:C.ink, marginBottom:8 }}>{PROP[key].label}</div>
                      <Field label="Include this inheritance"><Segmented value={p.on} onChange={setProp(key,"on")} options={[{label:"Include",value:true},{label:"Skip",value:false}]} /></Field>
                      {p.on && (<>
                        <div className="rc-inputs">
                          <Field label="Value today" hint={key==="at"?"≈ €300k at 1.08":"Market value"}><NumberInput value={p.value} onChange={setProp(key,"value")} prefix="$" /></Field>
                          <Field label="Year received"><NumberInput value={p.year} onChange={setProp(key,"year")} /></Field>
                        </div>
                        <Field label="What would you do with it?"><Segmented value={p.strategy} onChange={setProp(key,"strategy")} options={[{label:"Sell",value:"sell"},{label:"Rent",value:"rent"},{label:"Live in",value:"live"}]} /></Field>
                      </>)}
                    </div>
                  );
                })}
              </Section>

              <Section eyebrow="Step five" title="Family milestones">
                <p style={{ margin:"0 0 10px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>One-time gifts (weddings, home help, a grandchild's seed) and recurring costs (a new car every ~10 years, home upkeep). Set <b>Every</b> to repeat; leave it blank for a one-time event. Amounts are in today's dollars.</p>
                {s.events.map((ev, idx) => (
                  <div key={ev.id} style={{ border:`1px solid ${C.line}`, borderRadius:9, padding:"10px 12px 12px", marginBottom:10, background:C.panel }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                      <input type="text" value={ev.label} aria-label={`Event ${idx + 1} label`}
                        onChange={(e)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, label:e.target.value } : x); set("events")(next); }}
                        style={{ flex:1, minWidth:0, fontSize:13, fontWeight:600, padding:"8px 10px", border:`1px solid ${C.line}`, borderRadius:6, color:C.ink, boxSizing:"border-box" }} />
                      <button type="button" aria-label={`Remove event ${idx + 1}`} onClick={()=>removeEvent(idx)}
                        style={{ flex:"0 0 auto", border:"none", background:"none", color:C.clay, fontSize:22, cursor:"pointer", lineHeight:1, padding:"0 2px" }}>×</button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"auto 1fr 1fr", gap:10, alignItems:"end" }}>
                      <div>
                        <div style={{ fontSize:10.5, letterSpacing:.5, textTransform:"uppercase", color:C.slate, fontWeight:700, marginBottom:4 }}>Active</div>
                        <Segmented value={ev.on} onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, on:v } : x); set("events")(next); }}
                          options={[{label:"On",value:true},{label:"Off",value:false}]} />
                      </div>
                      <div>
                        <div style={{ fontSize:10.5, letterSpacing:.5, textTransform:"uppercase", color:C.slate, fontWeight:700, marginBottom:4 }}>{ev.everyYears ? "Start year" : "Year"}</div>
                        <NumberInput value={ev.year} aria-label={`Event ${idx + 1} year`}
                          onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, year:Number(v)||0 } : x); set("events")(next); }} />
                      </div>
                      <div>
                        <div style={{ fontSize:10.5, letterSpacing:.5, textTransform:"uppercase", color:C.slate, fontWeight:700, marginBottom:4 }}>Amount</div>
                        <NumberInput value={ev.amount} aria-label={`Event ${idx + 1} amount`} prefix="$"
                          onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, amount:Number(v)||0 } : x); set("events")(next); }} />
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, alignItems:"end", marginTop:10 }}>
                      <div>
                        <div style={{ fontSize:10.5, letterSpacing:.5, textTransform:"uppercase", color:C.slate, fontWeight:700, marginBottom:4 }}>Every (yrs)</div>
                        <NumberInput value={ev.everyYears ?? ""} aria-label={`Event ${idx + 1} repeat every years`} suffix="yrs"
                          onChange={(v)=>{ const ev2 = v===""? undefined : (Number(v)||0); const next=s.events.map((x,i)=> i===idx ? { ...x, everyYears:ev2 } : x); set("events")(next); }} />
                      </div>
                      <div>
                        <div style={{ fontSize:10.5, letterSpacing:.5, textTransform:"uppercase", color:C.slate, fontWeight:700, marginBottom:4 }}>Until year</div>
                        <NumberInput value={ev.untilYear ?? ""} aria-label={`Event ${idx + 1} until year`}
                          onChange={(v)=>{ const u = v===""? undefined : (Number(v)||0); const next=s.events.map((x,i)=> i===idx ? { ...x, untilYear:u } : x); set("events")(next); }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" aria-label="Add event" onClick={addEvent}
                  style={{ marginTop:4, padding:"6px 12px", fontSize:12.5, fontWeight:600, cursor:"pointer", background:"none", color:C.viridian, border:`1px solid ${C.viridian}`, borderRadius:6 }}>
                  + Add event
                </button>
              </Section>

              <Section eyebrow="Step six" title="Travel & longevity">
                <Field label={`Travel budget — ${usd0(s.travel.amount)}/yr, ${s.travel.startYear}–${s.travel.endYear}`} hint="Calendar-year window. With taper on, the budget steps down to the slow-go share from the slow-go year onward (the classic go-go / slow-go curve).">
                  <div className="rc-inputs">
                    <Field label="Amount / yr"><NumberInput value={s.travel.amount} onChange={(v)=>set("travel")({ ...s.travel, amount:Number(v)||0 })} prefix="$" /></Field>
                    <Field label="Start year"><NumberInput value={s.travel.startYear} onChange={(v)=>set("travel")({ ...s.travel, startYear:Number(v)||0 })} /></Field>
                    <Field label="End year"><NumberInput value={s.travel.endYear} onChange={(v)=>set("travel")({ ...s.travel, endYear:Number(v)||0 })} /></Field>
                  </div>
                  <div style={{ marginTop:6 }}>
                    <Segmented value={s.travel.taper} onChange={(v)=>set("travel")({ ...s.travel, taper:v })}
                      options={[{label:"Taper (go / slow-go)",value:true},{label:"Flat",value:false}]} />
                  </div>
                  {s.travel.taper && (
                    <div className="rc-inputs" style={{ marginTop:6 }}>
                      <Field label="Slow-go from year"><NumberInput value={s.travel.slowYear} onChange={(v)=>set("travel")({ ...s.travel, slowYear:Number(v)||0 })} /></Field>
                      <Field label="Slow-go spend" hint="Share of the full budget once slow-go begins."><NumberInput value={s.travel.slowPct} onChange={(v)=>set("travel")({ ...s.travel, slowPct:Number(v)||0 })} suffix="%" /></Field>
                    </div>
                  )}
                  <div style={{ marginTop:6 }}>
                    <Segmented value={s.travel.on} onChange={(v)=>set("travel")({ ...s.travel, on:v })}
                      options={[{label:"Include",value:true},{label:"Skip",value:false}]} />
                  </div>
                </Field>
                <Field label="Life expectancy" hint="Each spouse's expected age at death. The earlier death triggers the survivor transition — single-filer taxes, the larger SS kept, pension continuation — and the plan stops at the later death (capped by the plan horizon).">
                  <Segmented value={s.life.on} onChange={(v)=>set("life")({ ...s.life, on:v })}
                    options={[{label:"Model it",value:true},{label:"Skip",value:false}]} />
                  {s.life.on && (
                    <div style={{ marginTop:6 }}>
                      <div className="rc-inputs">
                        <Field label={`You — age at death`} hint={`You are ${s.ageA} now.`}><NumberInput value={s.life.deathAgeA} onChange={(v)=>set("life")({ ...s.life, deathAgeA:Number(v)||0 })} /></Field>
                        <Field label={`Spouse — age at death`} hint={`Spouse is ${s.ageB} now.`}><NumberInput value={s.life.deathAgeB} onChange={(v)=>set("life")({ ...s.life, deathAgeB:Number(v)||0 })} /></Field>
                      </div>
                      {(() => {
                        const dYearA = 2026 + (Number(s.life.deathAgeA) - Number(s.ageA));
                        const dYearB = 2026 + (Number(s.life.deathAgeB) - Number(s.ageB));
                        const survYou = dYearA >= dYearB;
                        const firstYr = Math.min(dYearA, dYearB);
                        return (
                          <span role="note" style={{ display:"block", fontSize:11.5, color:C.slate, marginTop:6, lineHeight:1.45 }}>
                            <b style={{ color:C.ink }}>{survYou ? "You" : "Your spouse"}</b> survive{survYou ? "" : "s"}; the transition begins in <b style={{ color:C.ink }}>{firstYr}</b>.
                          </span>
                        );
                      })()}
                      <div style={{ marginTop:6 }}>
                        <span style={{ display:"block", fontSize:11.5, color:C.slate, marginBottom:4 }}>Pension continues to survivor at (if the pension-holder dies first)</span>
                        <Segmented value={s.life.pensionPct} onChange={(v)=>set("life")({ ...s.life, pensionPct:v })}
                          options={[{label:"0% (life-only)",value:0},{label:"50%",value:50},{label:"100%",value:100}]} />
                      </div>
                    </div>
                  )}
                </Field>
              </Section>

              <button onClick={()=>setAdv(a=>!a)} style={{ width:"100%", background:"none", border:`1px dashed ${C.line}`, borderRadius:9, padding:"10px", color:C.slate, fontSize:12.5, fontWeight:600, cursor:"pointer", marginBottom:adv?16:8, fontFamily:"inherit" }}>{adv?"Hide assumptions ▲":"Long-term care & assumptions (return, inflation, withdrawal, tax) ▾"}</button>
              {adv && (<Section eyebrow="Optional" title="Strategy & assumptions">
                <Field label={`Real investment return — ${(s.realReturn*100).toFixed(1)}%`} hint="After inflation. A 60/40 mix has historically returned ~4–5% real."><input type="range" min={2} max={8} step={0.5} value={s.realReturn*100} onChange={(e)=>set("realReturn")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} /></Field>
                <Field label={`Inflation — ${(s.inflation*100).toFixed(1)}%`} hint="Translates today's costs into future dollars in the breakdowns."><input type="range" min={1} max={5} step={0.5} value={s.inflation*100} onChange={(e)=>set("inflation")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} /></Field>
                <Field label="Withdrawal rate"><Segmented value={s.swr} onChange={set("swr")} options={[{label:"3.9%",value:0.039},{label:"4%",value:0.04},{label:"5.7%",value:0.057}]} /></Field>
                <Field label="Plan horizon (age)" hint="How long to project. Defaults to 95; can't be set below the older spouse's current age.">
                  <NumberInput value={s.horizonAge} min={Math.max(Number(s.ageA)||0, Number(s.ageB)||0)}
                    onChange={(v)=>set("horizonAge")(v===""||v==null ? 95 : Number(v))} />
                </Field>
                <Field label="Extra income tax (state / foreign)" hint={`On top of US federal. ${locByName(s.retireLoc)?.region==="US"?"State rate on retirement income.":"Net of treaty + Foreign Tax Credit (you pay the higher, not both)."} Default for ${s.retireLoc}: ${Math.round((locByName(s.retireLoc)?.addlTaxRate||0)*100)}%. Leave blank to use it.`}>
                  <NumberInput value={s.stateRate==null ? "" : Math.round(s.stateRate*1000)/10} suffix="%"
                    onChange={(v)=>set("stateRate")(v===""||v==null ? null : (Number(v)||0)/100)} />
                </Field>
                <Field label="Long-term care" hint="~70% of retirees need it; one episode can run $50k–$200k/yr depending on location.">
                  <Segmented value={s.ltc.on} onChange={(v)=>set("ltc")({ ...s.ltc, on:v })}
                    options={[{label:"Model it",value:true},{label:"Skip",value:false}]} />
                  {!s.ltc.on && (
                    <span role="note" style={{ display:"block", fontSize:11.5, color:C.clay, marginTop:6, lineHeight:1.45 }}>
                      Not modeled. ~70% of 65-year-olds need long-term care; a multi-year episode can deplete your savings years earlier than shown.
                    </span>
                  )}
                  {s.ltc.on && (() => {
                    const locLtc = locByName(s.retireLoc)?.ltcAnnual ?? 0;
                    return (
                      <div style={{ marginTop:6 }}>
                        <div className="rc-inputs">
                          <Field label="Cost / yr" hint={`Default for ${s.retireLoc}: ${usd0(locLtc)} (private nursing care). Edit to override.`}>
                            <NumberInput value={s.ltc.annual ?? locLtc} onChange={(v)=>set("ltc")({ ...s.ltc, annual:Number(v)||0 })} prefix="$" suffix="/yr" />
                          </Field>
                          <Field label="Years"><NumberInput value={s.ltc.years} onChange={(v)=>set("ltc")({ ...s.ltc, years:Number(v)||0 })} /></Field>
                          <Field label="Starts at age"><NumberInput value={s.ltc.startAge} onChange={(v)=>set("ltc")({ ...s.ltc, startAge:Number(v)||0 })} /></Field>
                        </div>
                      </div>
                    );
                  })()}
                </Field>
              </Section>)}
            </div>
          </div>

          {/* RESULTS */}
          <div>
            <div className="rc-stat" style={{ background:C.ink, borderRadius:14, padding:"22px 24px", color:"#F4F1E8", marginBottom:16 }}>
              <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brass, fontWeight:700, marginBottom:6 }}>Sustainable income after benefits start</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:42, fontWeight:600, lineHeight:1, color:"#fff" }}>{usd0(steady.net)}</div>
                <div style={{ fontSize:13, color:"#C9D3CF" }}>/ yr after federal tax · today's dollars</div>
              </div>
              <div style={{ marginTop:6, fontSize:13.5, color:"#C9D3CF" }}>
                {usd0(steady.net/12)}/mo starting around your age {steady.startAgeA} · spending need then {usd0(steady.targetNeed)}/yr{steady.liveSav>0?` · includes ${usd0(steady.liveSav)}/yr lower housing cost`:""}
              </div>
              <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>
                You're modeling spending of <b>{usd0(steady.modeledSpend)}/yr</b>. At your withdrawal rate the plan can sustain up to <b>{usd0(steady.sustainableCapacity)}/yr</b> — assuming your base return holds, so this ceiling moves with the markets and isn't guaranteed.{steady.surplus>0 ? ` The ${usd0(steady.surplus)}/yr you don't spend stays invested as a buffer against weak returns, taxes, or long-term care — not a separate pot to draw on.` : ""}
              </div>
              <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:8, background:onTrack?"rgba(30,122,94,.22)":"rgba(190,74,43,.22)", border:`1px solid ${onTrack?C.viridian:C.clay}`, borderRadius:999, padding:"6px 13px", fontSize:13, fontWeight:600 }}>
                <span style={{ width:8, height:8, borderRadius:99, background:onTrack?"#5BD6A8":"#F09B82" }} />
                {onTrack ? `On track -- after-tax income covers the modeled spending need` : `Short of the modeled spending need`}
              </div>
              <div style={{ marginTop:10, fontSize:11.5, color:"#9FB0AB" }}>
                Social Security modeled at {s.ssMode==="full" ? "100% (assumes Congress acts)" : `${Math.round(effHaircut*100)}% from ${effCutYear}${s.ssMode==="trustees"?" (2025 Trustees projection)":""}`} · change it under Step two
              </div>
              <div style={{ marginTop:8, fontSize:11.5, color:"#9FB0AB", lineHeight:1.5 }}>
                This figure assumes a steady {(s.realReturn*100).toFixed(1)}% real return every year — a best-case-within-average, not a median outcome.{mc ? ` Monte Carlo median (P50): ${usd0(mc.sustainableIncome.p50)}/yr; 10th–90th pct ${usd0(mc.sustainableIncome.p10)}–${usd0(mc.sustainableIncome.p90)}/yr.` : ` Run Monte Carlo (below) for the realistic range.`}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
              {[
                { k:"Portfolio at benefit start", v:usd0(steady.FV), s:`@${(s.swr*100).toFixed(1)}% -> ${usd0(steady.wd)}/yr (incl. later property sales)` },
                { k:"Lifetime benefits", v:usd0(steady.guaranteed), s:`Social Security + WA pension before tax` },
                { k:"Savings last (tax-aware)", v:lastsTxt(simSS.depAge), s:`without SS: ${lastsTxt(simNo.depAge)}` },
                { k:"Federal tax", v:usd0(steady.tax), s:"Estimated with 2026 federal rules" },
              ].map((x,idx)=>(
                <div key={idx} className="rc-stat" style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:12, padding:"13px 14px" }}>
                  <div style={{ fontSize:11, color:C.slate, fontWeight:600, marginBottom:5 }}>{x.k}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20, fontWeight:600, color:C.ink }}>{x.v}</div>
                  <div style={{ fontSize:10.5, color:C.mut, marginTop:3, lineHeight:1.35 }}>{x.s}</div>
                </div>
              ))}
            </div>

            {/* SS risk */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Risk assessment</div>
              <h3 style={{ margin:"2px 0 4px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>If Social Security is cut</h3>
              <p style={{ margin:"0 0 12px", fontSize:12.5, color:C.slate, lineHeight:1.55 }}>
                The 2025 Trustees project the retirement trust fund falls short around 2033–34. It doesn't vanish — incoming payroll taxes still fund ~77–81% of scheduled benefits (sliding toward ~72% later), unless Congress acts, as it did in 1983. Here's all three cases against your plan:
              </p>
              {(() => {
                const rows = [
                  { key:"full", lab:"Congress acts — 100%", st:sFull, on:s.ssMode==="full" },
                  { key:"trustees", lab:`Trustees' 81% from ${Number(s.ssCutYear)||2034}`, st:sTrust, on:s.ssMode==="trustees" },
                  { key:"none", lab:"SS eliminated — 0% (stress test)", st:sNone, on:effHaircut===0 },
                ];
                const depFor = (k) => k==="full"?simFull.depAge : k==="trustees"?simTrust.depAge : simNone.depAge;
                return (
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                    <thead><tr style={{ color:C.mut, fontSize:11 }}>
                      <th style={{ textAlign:"left", fontWeight:600, padding:"3px 0" }}>Scenario</th>
                      <th style={{ textAlign:"right", fontWeight:600 }}>SS/yr</th>
                      <th style={{ textAlign:"right", fontWeight:600 }}>Income/yr</th>
                      <th style={{ textAlign:"right", fontWeight:600 }}>Lasts</th>
                    </tr></thead>
                    <tbody>
                      {rows.map(r=>(
                        <tr key={r.key} style={{ borderTop:`1px solid ${C.line}`, background:r.on?"#FCF6E8":"transparent" }}>
                          <td style={{ padding:"7px 0", color:C.inkSoft, fontWeight:r.on?700:400 }}>{r.on?"▸ ":""}{r.lab}</td>
                          <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.slate }}>{usd0(r.st.ssHouse)}</td>
                          <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.ink, fontWeight:600 }}>{usd0(r.st.net)}</td>
                          <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color: depFor(r.key)?C.clay:C.viridian }}>{depFor(r.key)?`age ${depFor(r.key)}`:`${horizon}+`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              {(() => {
                const ssShare = sFull.gross>0 ? sFull.ssHouse/sFull.gross : 0;
                const drop = sFull.net - sTrust.net;
                const okTrust = sTrust.net >= sTrust.targetNeed;
                const okNone = sNone.net >= sNone.targetNeed;
                return (
                  <div style={{ marginTop:12, fontSize:12.5, color:C.inkSoft, lineHeight:1.55, background:"#F6F4EC", borderRadius:9, padding:"10px 12px" }}>
                    Social Security is about <b style={{color:C.ink}}>{Math.round(ssShare*100)}%</b> of your retirement income, so the realistic 81% case trims roughly <b style={{color:C.ink}}>{usd0(drop)}/yr</b> — and you'd still be <b style={{color:okTrust?C.viridian:C.clay}}>{okTrust?"on track":"short of your goal"}</b>. Even if it were eliminated entirely (a deliberate worst case, not a forecast), your pension and savings would carry you {okNone?"and still meet the goal":`to age ${simNone.depAge||95}`}. Her Washington pension is the ballast here — it isn't affected by any of this.
                  </div>
                );
              })()}
            </div>

            {/* Inheritance card */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>The estate</div>
              <h3 style={{ margin:"2px 0 4px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>What to do with each home</h3>
              <p style={{ margin:"0 0 14px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>Pick a strategy on each card — the green-highlighted figure is its after-tax outcome. Your choice flows into the charts below.</p>
              {s.tx.on && <PropCard keyName="tx" />}
              {s.at.on && <PropCard keyName="at" />}
              {!s.tx.on && !s.at.on && <div style={{ fontSize:12.5, color:C.mut }}>Both inheritances are switched off. Turn one on in the inputs to model it.</div>}
            </div>

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
