import { useState, useMemo, useRef, useEffect } from "react";
import {
  ComposedChart, Area, Line, LineChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, ReferenceLine,
} from "recharts";
import { DEFAULT_LIFE, DEFAULT_LIFE_EVENTS, DEFAULT_TRAVEL, LOCATIONS, MC_DEFAULTS, PROP, SOURCES } from "./src/retirementData.js";
import {
  afcIsAuto,
  resolveAfc,
  calculatePlan,
  lineItems,
  monthlyTotal,
  ownBenefitAtClaimMonthly,
  proratedFraEstimate,
  propEcon,
  tierFor,
} from "./src/calculatorCore.js";

const SSA_FRA_URL = "https://secure.ssa.gov/myssa/bec-plan-prep-ui/bec-home";
const phaseNote = (l, f) => {
  const pre = `$${Math.round(l.hcPre*f).toLocaleString()}`, post = `$${Math.round(l.hcPost*f).toLocaleString()}`;
  if (l.region === "US") return `Medicare at 65 drops healthcare from ~${pre}/mo (full-price ACA before 65) to ~${post}/mo. Keep taxable income modest in the gap years and ACA subsidies can cut the earlier figure sharply.`;
  if (l.name === "Bahamas") return `No Medicare coverage abroad and private cover is age-rated, so healthcare here rises from ~${pre}/mo to ~${post}/mo. Budget for medical evacuation too.`;
  return `As a resident you can usually access the public system, so healthcare stays moderate (~${pre}/mo before 65, ~${post}/mo after). Medicare won't cover care here.`;
};

/* ------------------------ Format + tiers ------------------------ */
const usd0 = (x) => (x<0?"-$":"$") + Math.abs(Math.round(x)).toLocaleString();
const usdK = (x) => Math.abs(x) >= 1000 ? "$" + Math.round(x/1000) + "k" : "$" + Math.round(x);

export const mcSummaryLines = (mc, horizon = 95) => mc ? [
  `Success probability: ${Math.round(mc.successProb * 100)}%`,
  `Median sustainable income: ${mc.sustainableIncome.p50.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0})}`,
  `Worst-case (10th pct) savings run out at age: ${mc.depletionAge.p10 > horizon ? `beyond ${horizon}` : mc.depletionAge.p10}`,
] : [];

const C = { ink:"#102B28", inkSoft:"#1C3D39", paper:"#FBFAF6", panel:"#FFFFFF", line:"#E7E2D6",
  brass:"#B5852C", brassDeep:"#946B1E", viridian:"#1E7A5E", clay:"#BE4A2B", slate:"#5E6B67", mut:"#8A938F" };
const SRC = { salA:"#9DB4AE", salB:"#C6D2CD", rent:"#6E7F5C", pension:"#14302E", ssA:"#1E7A5E", ssB:"#69B197", wd:"#B5852C" };

/* The "Nest & Next" mark: two birds in a woven nest, with an arrow looking ahead. */
function NestLogo({ size = 46 }) {
  const w = (size * 58) / 40;
  return (
    <svg width={w} height={size} viewBox="0 0 58 40" fill="none" role="img"
      aria-label="Nest and Next logo" style={{ flexShrink:0, display:"block" }}>
      {/* the look-ahead arrow */}
      <path d="M41 20 H53" stroke={C.brass} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M48 14.5 L54 20 L48 25.5" stroke={C.brass} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* nest bowl + rim + woven twigs */}
      <path d="M5 22 C7 33 13 37 19.5 37 C26 37 32 33 34 22" stroke={C.brass} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M5 22 Q19.5 29 34 22" stroke={C.brassDeep} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 27 Q19.5 31 30 27" stroke={C.brassDeep} strokeWidth="1.2" opacity="0.7" />
      <path d="M11 31 Q19.5 33.5 28 31" stroke={C.brassDeep} strokeWidth="1.2" opacity="0.7" />
      {/* two birds facing each other */}
      <g fill={C.viridian}>
        <ellipse cx="15" cy="17" rx="3.4" ry="4.6" />
        <circle cx="15" cy="11.4" r="2.6" />
        <path d="M17.2 10.8 L19.8 11.6 L17.2 12.6 Z" />
      </g>
      <g fill="#F4F1E8">
        <ellipse cx="24" cy="17" rx="3.4" ry="4.6" />
        <circle cx="24" cy="11.4" r="2.6" />
        <path d="M21.8 10.8 L19.2 11.6 L21.8 12.6 Z" />
      </g>
    </svg>
  );
}

/* Chevron used by the header collapse/expand toggle. */
function Chevron({ up }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transition:"transform .2s ease", transform: up ? "rotate(180deg)" : "none" }}>
      <path d="M3.5 6 L8 10.5 L12.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------- UI atoms ---------------------------- */
function Field({ label, hint, children }) {
  return (<label style={{ display:"block", marginBottom:14 }}>
    <span style={{ display:"block", fontSize:12.5, fontWeight:600, color:C.ink, marginBottom:5 }}>{label}</span>
    {children}
    {hint && <span style={{ display:"block", fontSize:11, color:C.mut, marginTop:4, lineHeight:1.4 }}>{hint}</span>}
  </label>);
}
function AssumptionIcon({ title }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" role="img" aria-label={title}
      style={{ marginLeft:6, verticalAlign:"-1px", cursor:"help", flexShrink:0 }}>
      <title>{title}</title>
      <path d="M8 1.4 15 14H1z" fill={C.brass} stroke={C.brassDeep} strokeWidth="0.9" strokeLinejoin="round" />
      <rect x="7.25" y="5.4" width="1.5" height="4.2" rx="0.75" fill={C.paper} />
      <circle cx="8" cy="11.6" r="0.95" fill={C.paper} />
    </svg>
  );
}
const inputStyle = { width:"100%", boxSizing:"border-box", padding:"9px 11px", border:`1px solid ${C.line}`, borderRadius:8, fontSize:15, fontFamily:"'JetBrains Mono', monospace", color:C.ink, background:C.panel, outline:"none" };
function NumberInput({ value, onChange, prefix, suffix, min }) {
  // While focused, show exactly what the user is typing (draft). Applying `min`
  // on every keystroke fights the user: a leading digit below the floor gets
  // bumped up mid-edit, and the rest of their typing appends to it. Floor on blur.
  const [draft, setDraft] = useState(null);
  const commit = () => {
    if (draft == null) return;
    const d = draft; setDraft(null);
    if (d === "") return;
    const n = Number(d);
    if (min != null && Number.isFinite(n) && n < min) onChange(min);
  };
  const display = draft != null ? draft : (value === "" || value == null ? "" : value);
  return (<div style={{ position:"relative", display:"flex", alignItems:"center" }}>
    {prefix && <span style={{ position:"absolute", left:11, fontFamily:"'JetBrains Mono',monospace", color:C.slate, fontSize:14 }}>{prefix}</span>}
    <input type="number" value={display} min={min}
      onChange={(e)=>{ setDraft(e.target.value); onChange(e.target.value===""?"":Number(e.target.value)); }}
      onBlur={commit}
      style={{ ...inputStyle, paddingLeft: prefix?22:11, paddingRight: suffix?34:11 }} />
    {suffix && <span style={{ position:"absolute", right:11, fontFamily:"'JetBrains Mono',monospace", color:C.slate, fontSize:13 }}>{suffix}</span>}
  </div>);
}
function Select({ value, onChange, options }) {
  return (<select value={value} onChange={(e)=>onChange(e.target.value)} style={{ ...inputStyle, fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:13.5, cursor:"pointer" }}>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>);
}
function Segmented({ value, onChange, options }) {
  return (<div style={{ display:"flex", flex:"1 1 auto", minWidth:0, gap:4, background:"#F1EEE5", padding:4, borderRadius:9 }}>
    {options.map(o => { const on=value===o.value; return (
      <button key={String(o.value)} type="button" aria-pressed={on} onClick={()=>onChange(o.value)} style={{ flex:1, minWidth:0, padding:"7px 8px", border:"none", borderRadius:6, cursor:"pointer", whiteSpace:"normal", textAlign:"center", lineHeight:1.2, fontSize:12, fontWeight:600, fontFamily:"inherit", background:on?C.ink:"transparent", color:on?"#fff":C.slate, transition:"all .15s" }}>{o.label}</button>
    ); })}
  </div>);
}
function Section({ eyebrow, title, children }) {
  return (<section style={{ marginBottom:22 }}>
    <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700, marginBottom:3 }}>{eyebrow}</div>
    <h3 style={{ margin:"0 0 14px", fontFamily:"'Newsreader', serif", fontSize:20, fontWeight:500, color:C.ink }}>{title}</h3>
    {children}
  </section>);
}

/* ---------------------------- Main ---------------------------- */
export default function RetirementCalculator() {
  const [s, setS] = useState({
    ageA:57, ageB:48, stopA:65, stopB:56, claimA:65, claimB:65, pensionAge:65,
    incomeA:0, incomeB:170000, savings:670000, contrib:18000, targetPct:0.40, status:"married",
    ssModeA:"statement", ssModeB:"statement", ssFraA:50424, ssFraB:31592,
    pensionOn:true, system:"TRS", plan:3, pYears:22, afc:170000,
    realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
    ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
    retireLoc:"Austria",
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
  const sFactor = couple ? 1 : 0.64;
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
  const invName = { growth:"Growth", contrib:"Contributions", spendDraw:"Spending draw", forcedRmd:"Forced RMD", deferred:"Tax-deferred (401k/IRA)", afterTax:"After-tax (Roth/taxable)", rmd:"RMD this year" };

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
  const A = locByName(cmpA), B = locByName(cmpB);
  const aTot = annualCost(A), bTot = annualCost(B);
  const cheaper = aTot <= bTot ? cmpA : cmpB, cmpDiff = Math.abs(aTot - bTot);

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

  const SummaryCard = ({ name }) => {
    const l=locByName(name), tot=annualCost(l), surplus=steady.net-tot, tier=tierFor(steady.net/tot);
    return (<div style={{ flex:"1 1 160px", background:"#fff", border:`1px solid ${C.line}`, borderRadius:10, padding:"11px 13px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
        <span style={{ fontSize:12.5, fontWeight:700, color:C.ink }}>{name}</span>
        <span style={{ fontSize:10.5, fontWeight:700, color:tier.color, background:tier.color+"18", padding:"1px 7px", borderRadius:999 }}>{tier.label}</span>
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:600, color:C.ink }}>{usd0(tot)}<span style={{ fontSize:11, color:C.mut, fontWeight:400 }}>/yr</span></div>
      <div style={{ fontSize:11.5, color:surplus>=0?C.viridian:C.clay, fontWeight:600, marginTop:2 }}>{surplus>=0?`+${usd0(surplus)} · ${(steady.net/tot).toFixed(1)}×`:`${usd0(surplus)} short`}</div>
      <div style={{ fontSize:10.5, color:C.mut, marginTop:5, lineHeight:1.4 }}>{usd0(tot*inflFactor)}/yr in {retYear} · VAT {l.vat}<br/>Income tax: {l.incomeTax}</div>
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
                <Field label={`Retire on this share of income — ${Math.round(s.targetPct*100)}%`} hint={`Base spending goal: ${usd0(incomeHH*s.targetPct)}/yr. The timeline adds the pre-65 healthcare gap on top.`}>
                  <input type="range" min={20} max={80} step={5} value={s.targetPct*100} onChange={(e)=>set("targetPct")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} />
                </Field>
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
                <p style={{ margin:"0 0 10px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>One-time gifts you may make — weddings, home help, a savings seed per grandchild. Add as many as you need.</p>
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
                        <div style={{ fontSize:10.5, letterSpacing:.5, textTransform:"uppercase", color:C.slate, fontWeight:700, marginBottom:4 }}>Year</div>
                        <NumberInput value={ev.year} aria-label={`Event ${idx + 1} year`}
                          onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, year:Number(v)||0 } : x); set("events")(next); }} />
                      </div>
                      <div>
                        <div style={{ fontSize:10.5, letterSpacing:.5, textTransform:"uppercase", color:C.slate, fontWeight:700, marginBottom:4 }}>Amount</div>
                        <NumberInput value={ev.amount} aria-label={`Event ${idx + 1} amount`} prefix="$"
                          onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, amount:Number(v)||0 } : x); set("events")(next); }} />
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
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 14px 12px", marginBottom:16 }}>
              <div style={{ padding:"0 4px 6px" }}>
                <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>The staircase</div>
                <h3 style={{ margin:"2px 0 2px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:19 }}>Income by source, year by year</h3>
                <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>The dashed line is your spending need — it rises in the pre-65 years to cover full-price healthcare, then drops when Medicare/local cover kicks in. The portfolio (gold) fills whatever the other sources don't.{depAge!=null ? <> At the dotted line (<b style={{ color:C.clay }}>age {depAge}</b>) the gold runs out — savings are spent and you live on the guaranteed floor (SS{s.pensionOn?" + pension":""}{hasRental?" + rental":""}) of about <b style={{ color:C.clay }}>{usd0(floorAtDep)}/yr</b>{floorAtDep < needAtDep ? <>, roughly <b style={{ color:C.clay }}>{usd0(needAtDep - floorAtDep)}/yr short</b> of the need</> : <>, which still covers the need</>}.</> : <> The savings are never fully drawn down in this plan.</>}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontSize:11.5, color:C.slate, fontWeight:600 }}>Healthcare basis:</span>
                  <div style={{ minWidth:200, flex:"1 1 200px" }}><Select value={s.retireLoc} onChange={set("retireLoc")} options={LOCATIONS.map(l=>l.name)} /></div>
                </div>
                {locByName(s.retireLoc)?.region !== "US" && (() => {
                  const here = locByName(s.retireLoc);
                  const usNat = LOCATIONS.find(l => l.name === "US -- national average");
                  const gapYr = Math.max(0, (usNat.hcPre - here.hcPre) * 12);
                  return (
                    <div role="note" style={{ fontSize:11.5, color:C.slate, marginTop:2, lineHeight:1.45 }}>
                      Pre-65 healthcare here is <b style={{ color:C.ink }}>${here.hcPre.toLocaleString()}/mo</b> (couple). If you stayed in the US, full-price ACA runs ~<b style={{ color:C.ink }}>${usNat.hcPre.toLocaleString()}/mo</b> — about <b style={{ color:C.clay }}>{usd0(gapYr)}/yr more</b> until Medicare at 65. This plan assumes you live abroad.
                    </div>
                  );
                })()}
              </div>
              <ResponsiveContainer width="100%" height={252}>
                <ComposedChart data={compRows} margin={{ top:6, right:12, left:4, bottom:0 }}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
                  <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
                  <Tooltip content={compTip} />
                  <Area type="stepAfter" dataKey="Salary (you)" stackId="1" stroke="none" fill={SRC.salA} />
                  <Area type="stepAfter" dataKey="Salary (spouse)" stackId="1" stroke="none" fill={SRC.salB} />
                  <Area type="stepAfter" dataKey="Rental" stackId="1" stroke="none" fill={SRC.rent} />
                  <Area type="stepAfter" dataKey="Pension" stackId="1" stroke="none" fill={SRC.pension} />
                  <Area type="stepAfter" dataKey="SS (you)" stackId="1" stroke="none" fill={SRC.ssA} />
                  <Area type="stepAfter" dataKey="SS (spouse)" stackId="1" stroke="none" fill={SRC.ssB} />
                  <Area type="stepAfter" dataKey="Portfolio" stackId="1" stroke="none" fill={SRC.wd} />
                  <Line type="stepAfter" dataKey="need" stroke={C.clay} strokeWidth={1.6} strokeDasharray="5 4" dot={false} />
                  {compRows.filter(r=>r.extraSpend>0).map((r,i)=>(
                    <ReferenceDot key={`ev${i}`} x={r.age} y={r.need} r={3.5} fill={C.brass} stroke="#fff" strokeWidth={1.2} ifOverflow="extendDomain" />
                  ))}
                  {depAge!=null && <ReferenceLine x={depAge} stroke={C.clay} strokeWidth={1.4} strokeDasharray="2 2"
                    label={{ value:`savings gone · age ${depAge}`, position:"insideTopRight", fontSize:10.5, fill:C.clay }} />}
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:"6px 14px", flexWrap:"wrap", padding:"8px 6px 2px" }}>
                {[["Salary (you)",SRC.salA],["Salary (spouse)",SRC.salB],...(hasRental?[["Rental",SRC.rent]]:[]),["Pension",SRC.pension],["SS (you)",SRC.ssA],["SS (spouse)",SRC.ssB],["Portfolio draw",SRC.wd]].map(([n,c])=>(
                  <span key={n} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:11, height:11, borderRadius:3, background:c }} />{n}</span>
                ))}
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:14, height:0, borderTop:`2px dashed ${C.clay}` }} />spending need</span>
              </div>
            </div>

            {/* Inside the portfolio — flows + tax buckets */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 14px 12px", marginBottom:16 }}>
              <div style={{ padding:"0 4px 6px" }}>
                <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Inside the portfolio</div>
                <h3 style={{ margin:"2px 0 2px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:19 }}>What's happening to your investments</h3>
                <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>{
                  invView==="flow"
                    ? <>Money moving in and out each year. <b style={{ color:C.ink }}>Above</b> the line: contributions while you're still working, then investment growth. <b style={{ color:C.ink }}>Below</b>: the cash you actually draw for spending, plus any forced RMD.{firstRmdAge!=null ? <> Forced RMDs start at <b style={{ color:C.clay }}>age {firstRmdAge}</b>.</> : <> No forced RMDs in this plan.</>}</>
                    : <>Your savings split by tax treatment. The <b style={{ color:C.brassDeep }}>gold</b> band is pre-tax 401(k)/IRA money (subject to RMDs); the <b style={{ color:C.viridian }}>green</b> band is Roth/after-tax. {firstRmdAge!=null ? <>After <b style={{ color:C.clay }}>age {firstRmdAge}</b>, RMDs draw down the gold band — the after-tax remainder is reinvested, growing the green band, so the total keeps climbing.</> : <>With no pre-tax balance there are no RMDs to model.</>}{invView==="bucketsRmd" ? <> The <b style={{ color:C.clay }}>clay line</b> is each year's required distribution (right axis).</> : null}</>
                }</p>
                <div style={{ display:"flex", marginTop:4 }}>
                  <Segmented value={invView} onChange={setInvView} options={[{label:"Cash flow",value:"flow"},{label:"Tax buckets",value:"buckets"},{label:"Buckets + RMD",value:"bucketsRmd"}]} />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={244}>
                {invView==="flow" ? (
                  <ComposedChart data={invRows} margin={{ top:6, right:12, left:4, bottom:0 }} stackOffset="sign">
                    <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
                    <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
                    <Tooltip formatter={(v,n)=>[usd0(Math.abs(v)), invName[n]||n]} labelFormatter={(a)=>`Age ${a}`} contentStyle={{ borderRadius:8, border:`1px solid ${C.line}`, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }} />
                    <ReferenceLine y={0} stroke={C.slate} strokeWidth={1} />
                    <Bar dataKey="growth" stackId="f" fill={SRC.ssB} />
                    <Bar dataKey="contrib" stackId="f" fill={C.viridian} />
                    <Bar dataKey="spendDraw" stackId="f" fill={C.brass} />
                    <Bar dataKey="forcedRmd" stackId="f" fill={C.clay} />
                    {firstRmdAge!=null && <ReferenceLine x={firstRmdAge} stroke={C.clay} strokeWidth={1.2} strokeDasharray="2 2" label={{ value:`RMDs · ${firstRmdAge}`, position:"insideTopRight", fontSize:10.5, fill:C.clay }} />}
                  </ComposedChart>
                ) : (
                  <ComposedChart data={invRows} margin={{ top:6, right:12, left:4, bottom:0 }}>
                    <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
                    <YAxis yAxisId="bal" tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
                    <Tooltip formatter={(v,n)=>[usd0(Math.abs(v)), invName[n]||n]} labelFormatter={(a)=>`Age ${a}`} contentStyle={{ borderRadius:8, border:`1px solid ${C.line}`, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }} />
                    <Area yAxisId="bal" type="monotone" dataKey="deferred" stackId="bal" stroke="none" fill={C.brass} fillOpacity={0.85} />
                    <Area yAxisId="bal" type="monotone" dataKey="afterTax" stackId="bal" stroke="none" fill={C.viridian} fillOpacity={0.7} />
                    {invView==="bucketsRmd" && <YAxis yAxisId="rmd" orientation="right" tickFormatter={usdK} tick={{ fontSize:11, fill:C.clay }} tickLine={false} axisLine={false} width={42} />}
                    {invView==="bucketsRmd" && <Line yAxisId="rmd" type="monotone" dataKey="rmd" stroke={C.clay} strokeWidth={2} dot={false} />}
                    {firstRmdAge!=null && <ReferenceLine yAxisId="bal" x={firstRmdAge} stroke={C.clay} strokeWidth={1.2} strokeDasharray="2 2" label={{ value:`RMDs · ${firstRmdAge}`, position:"insideTopRight", fontSize:10.5, fill:C.clay }} />}
                  </ComposedChart>
                )}
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:"6px 14px", flexWrap:"wrap", padding:"8px 6px 2px" }}>
                {(invView==="flow"
                  ? [["Contributions",C.viridian],["Growth",SRC.ssB],["Spending draw",C.brass],["Forced RMD",C.clay]]
                  : [["Tax-deferred (401k/IRA)",C.brass],["After-tax (Roth/taxable)",C.viridian],...(invView==="bucketsRmd"?[["RMD this year",C.clay]]:[])]
                ).map(([n,c])=>(
                  <span key={n} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:11, height:11, borderRadius:3, background:c }} />{n}</span>
                ))}
              </div>
            </div>

            {/* Balance with vs without SS */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 14px 12px", marginBottom:16 }}>
              <div style={{ padding:"0 4px 6px" }}>
                <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>The long run</div>
                <h3 style={{ margin:"2px 0 2px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:19 }}>How far the savings stretch</h3>
                <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>The green line is your plan as modeled ({s.ssMode==="full"?"full SS":`${Math.round(effHaircut*100)}% SS`}). The clay dashed line drops Social Security entirely. The brass dotted line is a sequence-risk stress test — a market crash in your first retirement years (illustrative and milder than 2008; for the full downside range run Monte Carlo below).{sellDots.length>0?" The step up is an inherited home being sold.":""}</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={balRows} margin={{ top:6, right:14, left:4, bottom:0 }}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
                  <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
                  <Tooltip formatter={(v,n)=>[usd0(v), ({withSS:"With SS",withoutSS:"Without SS",stress:"Sequence-risk stress"}[n]??n)]} labelFormatter={(a)=>`Age ${a}`} contentStyle={{ borderRadius:8, border:`1px solid ${C.line}`, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }} />
                  <Line type="monotone" dataKey="withSS" stroke={C.viridian} strokeWidth={2.6} dot={false} name="withSS" />
                  <Line type="monotone" dataKey="withoutSS" stroke={C.clay} strokeWidth={2} strokeDasharray="5 4" dot={false} name="withoutSS" />
                  <Line type="monotone" dataKey="stress" stroke={C.brassDeep} strokeWidth={2} strokeDasharray="2 3" dot={false} name="stress" />
                  {sellDots.map((d,i)=><ReferenceDot key={i} x={d.age} y={d.bal} r={4} fill={C.brass} stroke="#fff" strokeWidth={1.5} />)}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap", padding:"6px 6px 2px" }}>
                <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.viridian, borderRadius:2 }} />With Social Security</span>
                <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.clay, borderRadius:2, borderTop:`2px dashed ${C.clay}` }} />Without SS</span>
                <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.brassDeep, borderRadius:2 }} />Sequence-risk stress</span>
              </div>
              <button onClick={runMc} disabled={mcRunning}
                style={{ marginTop:8, padding:"7px 14px", fontSize:12.5, fontWeight:600, cursor: mcRunning?"default":"pointer",
                  background:C.viridian, color:"#fff", border:"none", borderRadius:6, opacity: mcRunning?0.6:1 }}>
                {mcRunning ? "Running 1,000 paths…" : "Run Monte Carlo (1,000 paths)"}
              </button>
              {mc && (
                <div style={{ marginTop:10, padding:"10px 12px", background:C.paper, border:`1px solid ${C.line}`, borderRadius:8, fontSize:12.5, color:C.ink }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>Monte Carlo · {mc.paths.toLocaleString()} paths</div>
                  {mcSummaryLines(mc, horizon).map((line, i) => <div key={i}>{line}</div>)}
                  <div style={{ color:C.slate, marginTop:4 }}>
                    Sustainable income range: {usd0(mc.sustainableIncome.p10)} – {usd0(mc.sustainableIncome.p90)}/yr (10th–90th pct).
                  </div>
                </div>
              )}
              {mc && (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700, marginBottom:4, paddingLeft:4 }}>Monte Carlo · percentile fan</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={mc.balanceFan} margin={{ top:6, right:14, left:4, bottom:0 }}>
                      <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
                      <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
                      <Area type="monotone" dataKey="p90" stroke="none" fill={C.viridian} fillOpacity={0.12} />
                      <Area type="monotone" dataKey="p10" stroke="none" fill="#fff" fillOpacity={1} />
                      <Line type="monotone" dataKey="p50" stroke={C.viridian} strokeWidth={2.4} dot={false} />
                      <Line type="monotone" dataKey="p10" stroke={C.clay} strokeWidth={1.4} strokeDasharray="4 3" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ display:"flex", gap:14, flexWrap:"wrap", padding:"4px 6px 2px" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:11, height:11, borderRadius:3, background:C.viridian, opacity:0.25 }} />p10–p90 band</span>
                    <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:16, height:3, background:C.viridian, borderRadius:2 }} />p50 median</span>
                    <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:16, height:0, borderTop:`2px dashed ${C.clay}` }} />p10 worst-case</span>
                  </div>
                </div>
              )}
            </div>

            {/* Places */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px 20px", marginBottom:16 }}>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Places</div>
                <h3 style={{ margin:"2px 0 0", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>How far {usd0(steady.net)} stretches</h3>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                <Segmented value={couple} onChange={setCouple} options={[{label:"Couple",value:true},{label:"Single",value:false}]} />
                <Segmented value={stage} onChange={setStage} options={[{label:"Before 65",value:"pre"},{label:"65+ (Medicare)",value:"post"}]} />
              </div>
              <p style={{ margin:"0 0 14px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>Tap a place for the full monthly breakdown. The gold line is your after-tax income; switch the healthcare basis to see the pre-Medicare years.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {locRows.map((l)=>{
                  const max = Math.max(steady.net, locRows[locRows.length-1].cost)*1.05;
                  const open = openLoc===l.name, monthly = monthlyTotal(l,stage)*sFactor, surplus = steady.net-l.cost;
                  return (
                    <div key={l.name} style={{ border:`1px solid ${open?C.line:"transparent"}`, borderRadius:10, overflow:"hidden", background:open?"#FCFAF4":"transparent" }}>
                      <button
                        type="button"
                        className="rc-loc"
                        aria-expanded={open}
                        aria-controls={`loc-${l.name.replaceAll(" ","-")}`}
                        onClick={()=>setOpenLoc(open?null:l.name)}
                        style={{ display:"block", width:"100%", padding:"8px", border:"none", background:"transparent", borderRadius:9, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}
                      >
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:C.ink }}><span style={{ color:C.mut, marginRight:6, fontSize:11 }}>{open?"▾":"▸"}</span>{l.name} <span style={{ fontSize:10.5, color:C.mut, fontWeight:500 }}>· {l.region}</span></span>
                          <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.slate }}>{usdK(l.cost)}/yr</span>
                            <span style={{ fontSize:11, fontWeight:700, color:l.tier.color, background:l.tier.color+"18", padding:"2px 8px", borderRadius:999 }}>{l.tier.label}</span>
                          </span>
                        </div>
                        <div style={{ position:"relative", height:12, background:"#F1EEE5", borderRadius:6, overflow:"hidden" }}>
                          <div style={{ position:"absolute", inset:0, width:`${Math.min(100,(l.cost/max)*100)}%`, background:"#D9D2C2", borderRadius:6 }} />
                          <div style={{ position:"absolute", top:0, bottom:0, left:`${Math.min(100,(steady.net/max)*100)}%`, width:2.5, background:C.brass }} />
                        </div>
                      </button>
                      {open && (
                        <div id={`loc-${l.name.replaceAll(" ","-")}`} className="rc-exp" style={{ padding:"4px 12px 14px" }}>
                          <div style={{ fontSize:11.5, color:C.slate, lineHeight:1.45, marginBottom:10 }}>{l.note}</div>
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                            <thead><tr style={{ color:C.mut, fontSize:11 }}>
                              <th style={{ textAlign:"left", fontWeight:600, padding:"3px 0" }}>Monthly ({couple?"couple":"single"}, {stage==="pre"?"<65":"65+"})</th>
                              <th style={{ textAlign:"right", fontWeight:600 }}>/mo</th><th style={{ textAlign:"right", fontWeight:600 }}>/yr</th>
                            </tr></thead>
                            <tbody>
                              {lineItems(l,stage).map(([label,val])=>{ const isHC=label.indexOf("Healthcare")===0; return (
                                <tr key={label} style={{ borderTop:`1px solid ${C.line}`, background:isHC?"#F6F2E8":"transparent" }}>
                                  <td style={{ padding:"5px 0", color:isHC?C.brassDeep:C.inkSoft, fontWeight:isHC?600:400 }}>{label}</td>
                                  <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.ink }}>{usd0(val*sFactor)}</td>
                                  <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.slate }}>{usdK(val*sFactor*12)}</td>
                                </tr>
                              );})}
                              <tr style={{ borderTop:`2px solid ${C.ink}` }}>
                                <td style={{ padding:"6px 0", fontWeight:700, color:C.ink }}>Total cost of living</td>
                                <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:C.ink }}>{usd0(monthly)}</td>
                                <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:C.ink }}>{usdK(l.cost)}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:12 }}>
                            <div style={{ flex:"1 1 150px", background:"#fff", border:`1px solid ${C.line}`, borderRadius:9, padding:"9px 11px" }}>
                              <div style={{ fontSize:10.5, color:C.mut, fontWeight:600, marginBottom:3 }}>YOUR INCOME vs THIS BUDGET</div>
                              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:600, color:surplus>=0?C.viridian:C.clay }}>{surplus>=0?"+":""}{usd0(surplus)}/yr</div>
                              <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{surplus>=0?`${(steady.net/l.cost).toFixed(1)}× the local budget`:"income falls short here"}</div>
                            </div>
                            <div style={{ flex:"1 1 150px", background:"#fff", border:`1px solid ${C.line}`, borderRadius:9, padding:"9px 11px" }}>
                              <div style={{ fontSize:10.5, color:C.mut, fontWeight:600, marginBottom:3 }}>SAME BUDGET IN {retYear}</div>
                              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:600, color:C.ink }}>{usd0(l.cost*inflFactor)}/yr</div>
                              <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>at {(s.inflation*100).toFixed(1)}% inflation over {yearsToRet} yrs</div>
                            </div>
                          </div>
                          <div style={{ marginTop:10, fontSize:11.5, color:C.slate, lineHeight:1.5, background:"#F6F2E8", borderRadius:8, padding:"8px 10px" }}><b style={{ color:C.brassDeep }}>Healthcare by age.</b> {phaseNote(l, sFactor)}</div>
                          <div style={{ marginTop:8, fontSize:11.5, color:C.slate, lineHeight:1.5, background:"#F1EEE5", borderRadius:8, padding:"8px 10px" }}><b style={{ color:C.ink }}>Tax profile.</b> Consumption: {l.vat}. Income: {l.incomeTax}.</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize:10.5, color:C.mut, lineHeight:1.5, marginTop:12 }}>Cost figures aggregated from Numbeo, Wise, Expatistan, ERI, Eurostat, BLS CES, plus CMS (2026 Medicare: Part B $202.90/mo) and KFF (ACA). Rent = 2–3BR, quiet outside-centre area.</p>
            </div>

            {/* Compare */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px 18px", marginBottom:16 }}>
              <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Side by side</div>
              <h3 style={{ margin:"2px 0 12px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>Compare two places</h3>
              <div style={{ display:"flex", gap:10, marginBottom:6 }}>
                <div style={{ flex:1 }}><Select value={cmpA} onChange={setCmpA} options={LOCATIONS.map(l=>l.name)} /></div>
                <div style={{ flex:1 }}><Select value={cmpB} onChange={setCmpB} options={LOCATIONS.map(l=>l.name)} /></div>
              </div>
              <p style={{ margin:"2px 0 12px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>{cmpA===cmpB ? "Pick two different places to compare." : <>Living in <b style={{color:C.ink}}>{cheaper}</b> runs about <b style={{color:C.viridian}}>{usd0(cmpDiff)}/yr</b> less — {couple?"couple":"single"}, healthcare {stage==="pre"?"before 65":"at 65+"}.</>}</p>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                <thead><tr style={{ color:C.mut, fontSize:11 }}><th style={{ textAlign:"left", fontWeight:600, padding:"3px 0" }}>Monthly</th><th style={{ textAlign:"right", fontWeight:700, color:C.ink }}>{cmpA}</th><th style={{ textAlign:"right", fontWeight:700, color:C.ink }}>{cmpB}</th></tr></thead>
                <tbody>
                  {lineItems(A,stage).map(([label,va],idx)=>{
                    const vb=lineItems(B,stage)[idx][1], av=va*sFactor, bv=vb*sFactor, isHC=label.indexOf("Healthcare")===0;
                    return (<tr key={label} style={{ borderTop:`1px solid ${C.line}`, background:isHC?"#F6F2E8":"transparent" }}>
                      <td style={{ padding:"5px 0", color:isHC?C.brassDeep:C.inkSoft, fontWeight:isHC?600:400 }}>{label.replace(" -- before 65","").replace(" -- 65+","")}{isHC?` (${stage==="pre"?"<65":"65+"})`:""}</td>
                      <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:av<=bv?C.viridian:C.ink, fontWeight:av<=bv?600:400 }}>{usd0(av)}</td>
                      <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:bv<av?C.viridian:C.ink, fontWeight:bv<av?600:400 }}>{usd0(bv)}</td>
                    </tr>);
                  })}
                  <tr style={{ borderTop:`2px solid ${C.ink}` }}><td style={{ padding:"6px 0", fontWeight:700, color:C.ink }}>Total /mo</td>
                    <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:aTot<=bTot?C.viridian:C.ink }}>{usd0(aTot/12)}</td>
                    <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:bTot<aTot?C.viridian:C.ink }}>{usd0(bTot/12)}</td></tr>
                  <tr><td style={{ padding:"2px 0", fontSize:11, color:C.mut }}>Total /yr</td>
                    <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.slate }}>{usdK(aTot)}</td>
                    <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.slate }}>{usdK(bTot)}</td></tr>
                </tbody>
              </table>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:14 }}><SummaryCard name={cmpA} /><SummaryCard name={cmpB} /></div>
            </div>

            {/* Income mix */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700, marginBottom:2 }}>Steady state</div>
              <h3 style={{ margin:"0 0 12px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:18 }}>Sustainable income mix: {usd0(steady.gross)}/yr</h3>
              <div style={{ display:"flex", height:26, borderRadius:7, overflow:"hidden", marginBottom:10 }}>
                {incomeStack.map((seg,idx)=>(<div key={idx} title={`${seg.name}: ${usd0(seg.value)}`} style={{ width:`${(seg.value/steady.gross)*100}%`, background:seg.color }} />))}
              </div>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {incomeStack.map((seg,idx)=>(<div key={idx} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5 }}>
                  <span style={{ width:11, height:11, borderRadius:3, background:seg.color }} /><span style={{ color:C.slate }}>{seg.name}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color:C.ink }}>{usd0(seg.value)}</span></div>))}
              </div>
            </div>

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
