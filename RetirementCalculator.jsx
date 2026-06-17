import React, { useState, useMemo } from "react";
import {
  ComposedChart, Area, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";

/* ----------------------------------------------------------------------------
   2026 reference data (IRS Rev. Proc. 2025-32, SSA, WA DRS, CMS, KFF)
---------------------------------------------------------------------------- */
const FED = {
  single:  [[0,.10],[12400,.12],[50400,.22],[105700,.24],[201775,.32],[256225,.35],[640600,.37]],
  married: [[0,.10],[24800,.12],[100800,.22],[211400,.24],[403550,.32],[512450,.35],[768700,.37]],
};
const STD = { single: 16100, married: 32200 };
const SENIOR_ADDON = { single: 2050, married: 3300 };
const SENIOR_BONUS = 6000;
const BEND = [1286, 7749];
const SS_CAP = 184500;
const PROV = { single: [25000, 34000], married: [32000, 44000] };
const ERF_20 = {55:.39,56:.42,57:.45,58:.49,59:.54,60:.59,61:.66,62:.73,63:.82,64:.91,65:1};

/* Cost-of-living: monthly couple line items (USD) — Numbeo, Wise, Expatistan,
   ERI, Eurostat, BLS CES; CMS + KFF for the age-banded healthcare lines.
   hcPre = couple healthcare before 65 · hcPost = couple healthcare 65+. */
const LOCATIONS = [
  { name:"Bulgaria / Romania", region:"Europe", hcPre:280, hcPost:220, m:{rent:550,groceries:400,utilities:160,transport:100,dining:200,entertainment:120,misc:170}, vat:"20%", incomeTax:"Flat 10% — among the EU's lowest", note:"Lowest-cost EU. More cultural adjustment, fewer English services." },
  { name:"Greece", region:"Europe", hcPre:380, hcPost:300, m:{rent:780,groceries:500,utilities:200,transport:120,dining:300,entertainment:170,misc:250}, vat:"24%", incomeTax:"7% flat on foreign income for 15 yrs", note:"Treaty + 7% regime make pensions cheap to receive here." },
  { name:"Portugal", region:"Europe", hcPre:400, hcPost:300, m:{rent:1150,groceries:450,utilities:190,transport:100,dining:250,entertainment:150,misc:230}, vat:"23%", incomeTax:"Worldwide; old NHR break closed in 2024", note:"Figures are Porto/Algarve-style; central Lisbon runs higher. D7 visa needs ~€10,440/yr." },
  { name:"Spain", region:"Europe", hcPre:420, hcPost:320, m:{rent:1200,groceries:480,utilities:190,transport:110,dining:300,entertainment:180,misc:270}, vat:"21%", incomeTax:"Worldwide, ~19–47% progressive", note:"Non-Lucrative Visa needs ~€28,800/yr passive income." },
  { name:"Italy", region:"Europe", hcPre:420, hcPost:320, m:{rent:1250,groceries:500,utilities:220,transport:120,dining:320,entertainment:190,misc:290}, vat:"22%", incomeTax:"7% flat option in some southern towns", note:"Best value in the south and smaller cities." },
  { name:"France", region:"Europe", hcPre:480, hcPost:380, m:{rent:1600,groceries:580,utilities:250,transport:130,dining:400,entertainment:250,misc:340}, vat:"20%", incomeTax:"Worldwide; treaty often exempts US pensions", note:"Top-rated healthcare; Paris far pricier than the regions." },
  { name:"Austria", region:"Europe", hcPre:520, hcPost:420, m:{rent:1650,groceries:560,utilities:350,transport:110,dining:360,entertainment:220,misc:320}, vat:"20%", incomeTax:"Worldwide, up to 55%", note:"Vienna/Klagenfurt: superb services; worldwide taxation. Your inherited home lives here." },
  { name:"Netherlands", region:"Europe", hcPre:480, hcPost:420, m:{rent:2000,groceries:580,utilities:260,transport:130,dining:380,entertainment:240,misc:350}, vat:"21%", incomeTax:"Worldwide (box system)", note:"High quality of life, tight housing, no non-EU retirement visa." },
  { name:"US — low-cost (WV/OK/MS)", region:"US", hcPre:2200, hcPost:900, m:{rent:1150,groceries:650,utilities:320,transport:450,dining:350,entertainment:250,misc:400}, vat:"~6–8% sales tax", incomeTax:"State 0–5%; several exempt pensions", note:"Cheapest US housing. The pre-65 ACA years are the pinch point." },
  { name:"US — Texas / Florida", region:"US", hcPre:2400, hcPost:950, m:{rent:1500,groceries:700,utilities:350,transport:500,dining:400,entertainment:300,misc:450}, vat:"~7–8% sales tax", incomeTax:"No state income tax", note:"No state tax on her pension or withdrawals. Your inherited Texas home is here." },
  { name:"US — national average", region:"US", hcPre:2450, hcPost:1000, m:{rent:1700,groceries:750,utilities:360,transport:550,dining:450,entertainment:330,misc:480}, vat:"~7% sales tax", incomeTax:"State varies; 9 states have none", note:"Baseline comfortable US couple budget." },
  { name:"Bahamas", region:"Caribbean", hcPre:950, hcPost:1150, m:{rent:2900,groceries:950,utilities:420,transport:500,dining:500,entertainment:300,misc:480}, vat:"10% VAT + duties", incomeTax:"None — US federal still applies", note:"Zero income/CG/estate tax, but imports make it premium." },
  { name:"US — California", region:"US", hcPre:2600, hcPost:1100, m:{rent:2750,groceries:820,utilities:380,transport:600,dining:550,entertainment:380,misc:550}, vat:"~8–10% sales tax", incomeTax:"Up to ~13.3% state tax", note:"High cost and a heavy state tax on pension & withdrawals." },
  { name:"US — Hawaii / NYC", region:"US", hcPre:2300, hcPost:1100, m:{rent:3800,groceries:1150,utilities:500,transport:650,dining:750,entertainment:500,misc:700}, vat:"~4–9% sales tax", incomeTax:"Up to ~11% (HI) / ~14% (NYC)", note:"Premium cost of living; the stretch goal." },
];
const lineItems = (l, stage) => [
  ["Rent — 2–3BR, quiet area", l.m.rent],
  ["Groceries", l.m.groceries],
  ["Utilities + internet", l.m.utilities],
  [stage==="pre" ? "Healthcare — before 65 (ACA)" : "Healthcare — 65+ (Medicare/local)", stage==="pre" ? l.hcPre : l.hcPost],
  ["Transport", l.m.transport],
  ["Dining out", l.m.dining],
  ["Entertainment", l.m.entertainment],
  ["Other / household", l.m.misc],
];
const monthlyTotal = (l, stage) => Object.values(l.m).reduce((a,b)=>a+b,0) + (stage==="pre" ? l.hcPre : l.hcPost);
const phaseNote = (l, f) => {
  const pre = `$${Math.round(l.hcPre*f).toLocaleString()}`, post = `$${Math.round(l.hcPost*f).toLocaleString()}`;
  if (l.region === "US") return `Medicare at 65 drops healthcare from ~${pre}/mo (full-price ACA before 65) to ~${post}/mo. Keep taxable income modest in the gap years and ACA subsidies can cut the earlier figure sharply.`;
  if (l.name === "Bahamas") return `No Medicare coverage abroad and private cover is age-rated, so healthcare here rises from ~${pre}/mo to ~${post}/mo. Budget for medical evacuation too.`;
  return `As a resident you can usually access the public system, so healthcare stays moderate (~${pre}/mo before 65, ~${post}/mo after). Medicare won't cover care here.`;
};

/* Inherited-property economics */
const PROP = {
  tx: { label:"Texas home", place:"US — Texas / Florida", sellNet:0.93, rentYield:0.035, ownRate:0.027, rentMo:1500,
    notes:{
      sell:"US steps basis up to date-of-death value, so a near-term sale owes ~$0 capital-gains tax. No Texas estate, inheritance, or income tax; the estate is far under the $15M federal exemption. Budget ~7% selling costs.",
      rent:"No state income tax, but Texas property tax (~1.7%/yr) is high; federal depreciation shelters much of the rental income. Net ≈ 3.5% of value.",
      live:"You'd own a $790k asset, but Texas property tax + upkeep (~2.7%/yr) runs slightly above local rent — owning saves little cash here. Selling or renting puts the money to work." } },
  at: { label:"Klagenfurt home", place:"Austria", sellNet:0.90, rentYield:0.020, ownRate:0.012, rentMo:1650,
    notes:{
      sell:"No Austrian inheritance tax, but inheriting costs ~1.85% (transfer tax + registration), and a later sale faces 30% capital-gains tax — or 4.2% of price if the family owned it pre-2002 — with NO basis step-up. The US step-up zeroes US tax, so a foreign tax credit rarely offsets the Austrian bill.",
      rent:"Austrian rental income is taxed at source (progressive, with depreciation) and again on your US return with a foreign tax credit. Yields are modest — net ≈ 2% of value.",
      live:"The standout move. Austrian property tax is tiny, so owning replaces ~$1,650/mo of rent for ~$300/mo of carrying cost. A later primary-residence sale can also escape the 30% tax under the 5-of-10-years rule." } },
};
const propEcon = (key, value) => {
  const m = PROP[key];
  return { sell: value*m.sellNet, rent: value*m.rentYield, live: m.rentMo*12 - value*m.ownRate };
};

/* ----------------------------- Math ----------------------------- */
const fedTax = (ti, s) => { const b=FED[s]; let t=0; for (let i=0;i<b.length;i++){ const lo=b[i][0], hi=i<b.length-1?b[i+1][0]:Infinity; if (ti>lo) t+=(Math.min(ti,hi)-lo)*b[i][1]; } return t; };
const pia = (inc) => { const a=Math.min(inc,SS_CAP)/12; return 0.9*Math.min(a,BEND[0])+0.32*Math.max(0,Math.min(a,BEND[1])-BEND[0])+0.15*Math.max(0,a-BEND[1]); };
const ssAtClaim = (p,c) => { if (c<67){ const m=(67-c)*12; const r=m<=36?m*(5/9)/100:(36*(5/9)+(m-36)*(5/12))/100; return p*(1-r);} if (c>67){ const m=Math.min((c-67)*12,36); return p*(1+m*(2/3)/100);} return p; };
const taxableSS = (other,ss,s) => { const pr=other+0.5*ss,[t1,t2]=PROV[s]; if (pr<=t1) return 0; if (pr<=t2) return Math.min(0.5*ss,0.5*(pr-t1)); return Math.min(0.85*ss,0.85*(pr-t2)+Math.min(0.5*ss,0.5*(t2-t1))); };
const pensionERF = (age,years) => age>=65?1:years>=30?Math.max(0,1-0.05*(65-age)):age<55?0:(ERF_20[Math.round(age)]??0.39);

function benefits(i) {
  const piaA=pia(i.incomeA), piaB=pia(i.incomeB);
  let ssA=ssAtClaim(piaA,i.claimA)*12, ssB=ssAtClaim(piaB,i.claimB)*12;
  ssA=Math.max(ssA, piaB>piaA?ssAtClaim(0.5*piaB,i.claimA)*12:0);
  ssB=Math.max(ssB, piaA>piaB?ssAtClaim(0.5*piaA,i.claimB)*12:0);
  const erf=i.pensionOn?pensionERF(i.pensionAge,i.pYears):1;
  const pension=i.pensionOn?(i.plan===3?0.01:0.02)*i.pYears*i.afc*erf:0;
  return { ssA, ssB, pension, erf };
}

function simulate(i, ssOpt) {
  const on = ssOpt.on, hc = ssOpt.haircut==null?1:ssOpt.haircut, cutY = ssOpt.cutYear==null?9999:ssOpt.cutYear;
  const { ssA:ssAfull, ssB:ssBfull, pension:pensFull } = benefits(i);
  const base = i.incomeHH*i.targetPct, r=i.realReturn;
  const perPersonHC = Math.max(0, (i.hcPre - i.hcPost))/2;     // monthly, per person under 65
  const end = Math.max(95-i.ageA, 95-i.ageB);
  let bal=i.savings, depAge=null, fullyRetAge=null, balAtFullRet=null;
  const rows=[];
  for (let y=0; y<=end; y++) {
    const aA=i.ageA+y, aB=i.ageB+y, cal=2026+y;
    const workA=aA<i.stopA, workB=aB<i.stopB;
    const salA=workA?i.incomeA:0, salB=workB?i.incomeB:0;
    const pens=(i.pensionOn && aB>=i.pensionAge)?pensFull:0;
    const ssFac = cal>=cutY ? hc : 1;
    const ssAy=(on && aA>=i.claimA)?ssAfull*ssFac:0;
    const ssBy=(on && aB>=i.claimB)?ssBfull*ssFac:0;
    let rent=0, liveSav=0, sellLump=0;
    for (const p of i.inher) {
      if (p.type==="rent" && cal>=p.year) rent+=p.rent;
      if (p.type==="live" && cal>=p.year) liveSav+=p.live;
      if (p.type==="sell" && cal===p.year) sellLump+=p.sell;
    }
    const under65 = (aA<65?1:0)+(aB<65?1:0);
    const hcBump = perPersonHC*under65*12;
    const need = Math.max(0.35*base, base + hcBump - liveSav);
    const nonPort = salA+salB+pens+ssAy+ssBy+rent;
    bal = bal*(1+r);
    bal += ((workA?0.5:0)+(workB?0.5:0))*i.contrib;
    bal += sellLump;
    let wd = Math.max(0, need-nonPort);
    wd = Math.min(wd, Math.max(0,bal));
    bal -= wd;
    if (bal<1) bal=0;
    if (!workA && !workB && fullyRetAge===null) { fullyRetAge=aA; balAtFullRet=bal; }
    if (bal<=0 && depAge===null && (need-nonPort)>0) depAge=aA;
    rows.push({ aA, aB, cal, salA, salB, rent, pens, ssA:ssAy, ssB:ssBy, wd:Math.round(wd), bal:Math.round(bal), need:Math.round(need), sellLump:Math.round(sellLump) });
  }
  return { rows, depAge, fullyRetAge: fullyRetAge??i.ageA, balAtFullRet: balAtFullRet??bal };
}

/* ------------------------ Format + tiers ------------------------ */
const usd0 = (x) => (x<0?"-$":"$") + Math.abs(Math.round(x)).toLocaleString();
const usdK = (x) => Math.abs(x) >= 1000 ? "$" + Math.round(x/1000) + "k" : "$" + Math.round(x);
const TIERS = [
  { max:0.8, label:"Tight", color:"#BE4A2B" }, { max:1.15, label:"Modest", color:"#C7972F" },
  { max:1.7, label:"Comfortable", color:"#1E7A5E" }, { max:2.6, label:"Affluent", color:"#14302E" },
  { max:Infinity, label:"Luxurious", color:"#7A4FA0" },
];
const tierFor = (ratio) => TIERS.find(t => ratio < t.max);

const C = { ink:"#102B28", inkSoft:"#1C3D39", paper:"#FBFAF6", panel:"#FFFFFF", line:"#E7E2D6",
  brass:"#B5852C", brassDeep:"#946B1E", viridian:"#1E7A5E", clay:"#BE4A2B", slate:"#5E6B67", mut:"#8A938F" };
const SRC = { salA:"#9DB4AE", salB:"#C6D2CD", rent:"#6E7F5C", pension:"#14302E", ssA:"#1E7A5E", ssB:"#69B197", wd:"#B5852C" };

/* ---------------------------- UI atoms ---------------------------- */
function Field({ label, hint, children }) {
  return (<label style={{ display:"block", marginBottom:14 }}>
    <span style={{ display:"block", fontSize:12.5, fontWeight:600, color:C.ink, marginBottom:5 }}>{label}</span>
    {children}
    {hint && <span style={{ display:"block", fontSize:11, color:C.mut, marginTop:4, lineHeight:1.4 }}>{hint}</span>}
  </label>);
}
const inputStyle = { width:"100%", boxSizing:"border-box", padding:"9px 11px", border:`1px solid ${C.line}`, borderRadius:8, fontSize:15, fontFamily:"'JetBrains Mono', monospace", color:C.ink, background:C.panel, outline:"none" };
function NumberInput({ value, onChange, prefix, suffix, min }) {
  return (<div style={{ position:"relative", display:"flex", alignItems:"center" }}>
    {prefix && <span style={{ position:"absolute", left:11, fontFamily:"'JetBrains Mono',monospace", color:C.slate, fontSize:14 }}>{prefix}</span>}
    <input type="number" value={value} min={min} onChange={(e)=>onChange(e.target.value===""?"":Number(e.target.value))}
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
  return (<div style={{ display:"flex", gap:4, background:"#F1EEE5", padding:4, borderRadius:9 }}>
    {options.map(o => { const on=value===o.value; return (
      <button key={String(o.value)} onClick={()=>onChange(o.value)} style={{ flex:1, padding:"7px 8px", border:"none", borderRadius:6, cursor:"pointer", whiteSpace:"nowrap", fontSize:12, fontWeight:600, fontFamily:"inherit", background:on?C.ink:"transparent", color:on?"#fff":C.slate, transition:"all .15s" }}>{o.label}</button>
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
    ageA:45, ageB:45, stopA:62, stopB:60, claimA:67, claimB:67, pensionAge:65,
    incomeA:90000, incomeB:75000, savings:300000, contrib:18000, targetPct:0.30, status:"married",
    pensionOn:true, system:"TRS", plan:2, pYears:20, afc:78000,
    realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
    ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
    retireLoc:"US — national average",
    tx:{ on:true, value:790000, year:2038, strategy:"rent" },
    at:{ on:true, value:324000, year:2040, strategy:"live" },
  });
  const [couple, setCouple] = useState(true);
  const [stage, setStage] = useState("post");
  const [adv, setAdv] = useState(false);
  const [openLoc, setOpenLoc] = useState("Portugal");
  const [cmpA, setCmpA] = useState("Austria");
  const [cmpB, setCmpB] = useState("US — Texas / Florida");
  const set = (k) => (v) => setS(p => ({ ...p, [k]: v }));
  const setProp = (key, field) => (v) => setS(p => ({ ...p, [key]: { ...p[key], [field]: v } }));

  const incomeHH = (Number(s.incomeA)||0) + (Number(s.incomeB)||0);
  const retLocObj = LOCATIONS.find(l => l.name === s.retireLoc) || LOCATIONS[10];

  // active inheritance effects
  const inher = useMemo(() => {
    const out = [];
    for (const key of ["tx","at"]) {
      const p = s[key]; if (!p.on) continue;
      const e = propEcon(key, Number(p.value)||0);
      out.push({ key, year:Number(p.year)||2038, type:p.strategy, sell:e.sell, rent:e.rent, live:e.live });
    }
    return out;
  }, [s.tx, s.at]);

  const inp = { ...s, incomeHH, inher, hcPre:retLocObj.hcPre, hcPost:retLocObj.hcPost };

  const calc = useMemo(() => {
    const effHaircut = s.ssMode==="full" ? 1 : s.ssMode==="trustees" ? 0.81 : Math.max(0, Math.min(1, (Number(s.ssHaircut)||0)/100));
    const effCutYear = s.ssMode==="full" ? 9999 : (Number(s.ssCutYear)||2034);
    const trustCut = Number(s.ssCutYear)||2034;
    const simChosen = simulate(inp, { on: effHaircut>0, haircut: effHaircut, cutYear: effCutYear });
    const simFull   = simulate(inp, { on:true, haircut:1, cutYear:9999 });
    const simTrust  = simulate(inp, { on:true, haircut:0.81, cutYear:trustCut });
    const simNone   = simulate(inp, { on:false });
    const b = benefits(inp);
    const cs = (sim, hc) => {
      const fullCal = 2026 + (sim.fullyRetAge - s.ageA);
      let sellAfter=0, rentInc=0, liveSav=0;
      for (const p of inher) { if (p.type==="sell" && p.year>fullCal) sellAfter+=p.sell; if (p.type==="rent") rentInc+=p.rent; if (p.type==="live") liveSav+=p.live; }
      const FV = sim.balAtFullRet + sellAfter;
      const wd = FV*s.swr;
      const ssA=b.ssA*hc, ssB=b.ssB*hc, ssHouse=ssA+ssB;
      const guaranteed = ssHouse + b.pension + rentInc;
      const gross = guaranteed + wd;
      const ordinary = wd*s.tradFrac + b.pension + rentInc;
      const tSS = taxableSS(ordinary, ssHouse, s.status);
      const agi = ordinary + tSS;
      let ded = STD[s.status]+SENIOR_ADDON[s.status];
      let bonus = SENIOR_BONUS*(s.status==="married"?2:1); const mp=s.status==="married"?150000:75000;
      if (agi>mp) bonus=Math.max(0,bonus-(agi-mp)*0.06); ded+=bonus;
      const tax = fedTax(Math.max(0,agi-ded), s.status);
      return { FV, wd, ssA, ssB, pension:b.pension, erf:b.erf, ssHouse, guaranteed, rentInc, liveSav, gross, net:gross-tax, tax, target:incomeHH*s.targetPct };
    };
    return { effHaircut, effCutYear, simChosen, simFull, simTrust, simNone,
      steady: cs(simChosen, effHaircut), sFull: cs(simFull,1), sTrust: cs(simTrust,0.81), sNone: cs(simNone,0) };
  }, [s, incomeHH, inher]);

  const { simChosen, simFull, simTrust, simNone, steady, sFull, sTrust, sNone, effHaircut, effCutYear } = calc;
  const simSS = simChosen, simNo = simNone;

  const onTrack = steady.guaranteed + steady.wd >= steady.target;
  const lastsTxt = (d) => d ? `age ${d}` : "beyond 95";
  const sFactor = couple ? 1 : 0.64;
  const yearsToRet = Math.max(0, simSS.fullyRetAge - s.ageA);
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
    "SS (spouse)":Math.round(r.ssB), "Portfolio":r.wd, need:r.need,
  }));
  const balRows = simSS.rows.map((r, idx) => ({ age:r.aA, withSS:r.bal, withoutSS: simNo.rows[idx] ? simNo.rows[idx].bal : 0 }));
  const sellDots = simSS.rows.filter(r => r.sellLump > 0).map(r => ({ age:r.aA, bal:r.bal }));
  const endSS = balRows[balRows.length-1].withSS, endNo = balRows[balRows.length-1].withoutSS;
  const hasRental = inher.some(p => p.type === "rent");

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
    const val = { sell:e.sell, rent:e.rent, live:e.live }[chosen];
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
    <div style={{ background:C.paper, minHeight:"100%", color:C.ink, fontFamily:"'Inter', system-ui, sans-serif", WebkitFontSmoothing:"antialiased" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        input[type=number]::-webkit-inner-spin-button { opacity:.25; }
        .rc-grid { display:grid; grid-template-columns:1fr; gap:0; }
        @media (min-width:980px){ .rc-grid { grid-template-columns:430px 1fr; } }
        .rc-inputs { display:grid; grid-template-columns:1fr 1fr; gap:0 14px; }
        .rc-stat { animation:rise .5s ease both; }
        @keyframes rise { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
        @media (prefers-reduced-motion:reduce){ .rc-stat{ animation:none; } }
        .rc-loc:hover { background:#F6F2E8; }
        .rc-exp { animation:exp .25s ease both; }
        @keyframes exp { from{opacity:0;} to{opacity:1;} }
      `}</style>

      <header style={{ background:C.ink, color:"#F4F1E8", padding:"30px 22px 26px" }}>
        <div style={{ maxWidth:1160, margin:"0 auto" }}>
          <div style={{ fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:C.brass, fontWeight:700 }}>Retirement planner · 2026 figures</div>
          <h1 style={{ fontFamily:"'Newsreader', serif", fontWeight:400, fontSize:34, lineHeight:1.1, margin:"8px 0 10px", letterSpacing:-.5 }}>The Ledger &amp; the Atlas</h1>
          <p style={{ margin:0, maxWidth:680, fontSize:14.5, lineHeight:1.55, color:"#C9D3CF" }}>
            Every income stream mapped year by year — salaries, two Social Security checks, her Washington
            pension, two inherited homes — against the cost of living from Sofia to the Bahamas, with the
            pre-Medicare healthcare gap and cross-border inheritance taxes built in.
          </p>
        </div>
      </header>

      <div style={{ maxWidth:1160, margin:"0 auto", padding:"24px 22px 60px" }}>
        <div className="rc-grid">
          {/* INPUTS */}
          <div>
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"20px 20px 6px", marginBottom:18 }}>
              <Section eyebrow="Step one" title="Your household, today">
                <div className="rc-inputs">
                  <Field label="Your age now"><NumberInput value={s.ageA} onChange={set("ageA")} /></Field>
                  <Field label="Spouse age now"><NumberInput value={s.ageB} onChange={set("ageB")} /></Field>
                  <Field label="Your annual income"><NumberInput value={s.incomeA} onChange={set("incomeA")} prefix="$" /></Field>
                  <Field label="Spouse income" hint="Her teaching salary."><NumberInput value={s.incomeB} onChange={set("incomeB")} prefix="$" /></Field>
                  <Field label="Combined savings now"><NumberInput value={s.savings} onChange={set("savings")} prefix="$" /></Field>
                  <Field label="Saved per year" hint="Stops as each of you retires."><NumberInput value={s.contrib} onChange={set("contrib")} prefix="$" /></Field>
                </div>
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
                <div style={{ fontSize:12, color:C.slate, background:"#F6F4EC", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
                  Scheduled benefits: your SS <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(sFull.ssA)}</b>, spouse SS <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(sFull.ssB)}</b>/yr at full funding. Use your SSA statement for precision.
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

              <Section eyebrow="Step three" title="Her Washington State pension">
                <Field label="Include the DRS pension"><Segmented value={s.pensionOn} onChange={set("pensionOn")} options={[{label:"Include",value:true},{label:"Skip",value:false}]} /></Field>
                {s.pensionOn && (<>
                  <div className="rc-inputs">
                    <Field label="System" hint="TRS = teachers · SERS = staff."><Segmented value={s.system} onChange={set("system")} options={[{label:"TRS",value:"TRS"},{label:"SERS",value:"SERS"}]} /></Field>
                    <Field label="Plan" hint="Plan 2 = 2%/yr · Plan 3 = 1%/yr."><Segmented value={s.plan} onChange={set("plan")} options={[{label:"Plan 2",value:2},{label:"Plan 3",value:3}]} /></Field>
                    <Field label="Years of service"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
                    <Field label="Pension starts at" hint="Before 65 it's reduced."><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
                  </div>
                  <Field label="Average final compensation (AFC)" hint="Avg pay over her highest 60 consecutive months."><NumberInput value={s.afc} onChange={set("afc")} prefix="$" suffix="/yr" /></Field>
                  <div style={{ fontSize:12, color:C.slate, background:"#F6F4EC", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
                    {s.plan===2?"2%":"1%"} × {s.pYears} × {usd0(s.afc)}{steady.erf<1?` × ${steady.erf.toFixed(2)} early factor`:""} = <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo).{steady.erf<1?" Before 65 with 20–29 yrs takes a steep cut.":""}
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

              <button onClick={()=>setAdv(a=>!a)} style={{ width:"100%", background:"none", border:`1px dashed ${C.line}`, borderRadius:9, padding:"10px", color:C.slate, fontSize:12.5, fontWeight:600, cursor:"pointer", marginBottom:adv?16:8, fontFamily:"inherit" }}>{adv?"Hide assumptions ▲":"Adjust assumptions (return, inflation, withdrawal, tax mix) ▾"}</button>
              {adv && (<Section eyebrow="Optional" title="Strategy & assumptions">
                <Field label={`Real investment return — ${(s.realReturn*100).toFixed(1)}%`} hint="After inflation. A 60/40 mix has historically returned ~4–5% real."><input type="range" min={2} max={8} step={0.5} value={s.realReturn*100} onChange={(e)=>set("realReturn")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} /></Field>
                <Field label={`Inflation — ${(s.inflation*100).toFixed(1)}%`} hint="Translates today's costs into future dollars in the breakdowns."><input type="range" min={1} max={5} step={0.5} value={s.inflation*100} onChange={(e)=>set("inflation")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} /></Field>
                <Field label="Withdrawal rate"><Segmented value={s.swr} onChange={set("swr")} options={[{label:"3.9%",value:0.039},{label:"4%",value:0.04},{label:"5.7%",value:0.057}]} /></Field>
                <Field label={`Taxable share of withdrawals — ${Math.round(s.tradFrac*100)}%`} hint="Portion from pre-tax 401(k)/IRA."><input type="range" min={0} max={100} step={10} value={s.tradFrac*100} onChange={(e)=>set("tradFrac")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} /></Field>
              </Section>)}
            </div>
          </div>

          {/* RESULTS */}
          <div>
            <div className="rc-stat" style={{ background:C.ink, borderRadius:14, padding:"22px 24px", color:"#F4F1E8", marginBottom:16 }}>
              <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brass, fontWeight:700, marginBottom:6 }}>Sustainable income, once everyone's retired</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:42, fontWeight:600, lineHeight:1, color:"#fff" }}>{usd0(steady.net)}</div>
                <div style={{ fontSize:13, color:"#C9D3CF" }}>/ yr after federal tax · today's dollars</div>
              </div>
              <div style={{ marginTop:6, fontSize:13.5, color:"#C9D3CF" }}>{usd0(steady.net/12)}/mo · base goal {usd0(steady.target)}/yr{steady.liveSav>0?` · +${usd0(steady.liveSav)}/yr housing saved by living in an inherited home`:""}</div>
              <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:8, background:onTrack?"rgba(30,122,94,.22)":"rgba(190,74,43,.22)", border:`1px solid ${onTrack?C.viridian:C.clay}`, borderRadius:999, padding:"6px 13px", fontSize:13, fontWeight:600 }}>
                <span style={{ width:8, height:8, borderRadius:99, background:onTrack?"#5BD6A8":"#F09B82" }} />
                {onTrack ? `On track — guaranteed income covers ${Math.min(999,Math.round(steady.guaranteed/steady.target*100))}% of the goal on its own` : `Short of the goal at this spending level`}
              </div>
              <div style={{ marginTop:10, fontSize:11.5, color:"#9FB0AB" }}>
                Social Security modeled at {s.ssMode==="full" ? "100% (assumes Congress acts)" : `${Math.round(effHaircut*100)}% from ${effCutYear}${s.ssMode==="trustees"?" (2025 Trustees projection)":""}`} · change it under Step two
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
              {[
                { k:"Portfolio when both retire", v:usd0(steady.FV), s:`@${(s.swr*100).toFixed(1)}% → ${usd0(steady.wd)}/yr (incl. property sales)` },
                { k:"Guaranteed for life", v:usd0(steady.guaranteed), s:`SS + pension${steady.rentInc>0?" + rental":""}, COLA-adjusted` },
                { k:"Savings last (with SS)", v:lastsTxt(simSS.depAge), s:`without SS: ${lastsTxt(simNo.depAge)}` },
                { k:"Federal tax", v:usd0(steady.tax), s:"WA has no state income tax" },
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
                          <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color: depFor(r.key)?C.clay:C.viridian }}>{depFor(r.key)?`age ${depFor(r.key)}`:"95+"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              {(() => {
                const ssShare = sFull.gross>0 ? sFull.ssHouse/sFull.gross : 0;
                const drop = sFull.net - sTrust.net;
                const okTrust = sTrust.guaranteed + sTrust.wd >= sTrust.target;
                const okNone = sNone.guaranteed + sNone.wd >= sNone.target;
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
                <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>The dashed line is your spending need — it rises in the pre-65 years to cover full-price healthcare, then drops when Medicare/local cover kicks in. The portfolio (gold) fills whatever the other sources don't.</p>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontSize:11.5, color:C.slate, fontWeight:600 }}>Healthcare basis:</span>
                  <div style={{ minWidth:200, flex:"1 1 200px" }}><Select value={s.retireLoc} onChange={set("retireLoc")} options={LOCATIONS.map(l=>l.name)} /></div>
                </div>
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
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:"6px 14px", flexWrap:"wrap", padding:"8px 6px 2px" }}>
                {[["Salary (you)",SRC.salA],["Salary (spouse)",SRC.salB],...(hasRental?[["Rental",SRC.rent]]:[]),["Pension",SRC.pension],["SS (you)",SRC.ssA],["SS (spouse)",SRC.ssB],["Portfolio draw",SRC.wd]].map(([n,c])=>(
                  <span key={n} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:11, height:11, borderRadius:3, background:c }} />{n}</span>
                ))}
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:14, height:0, borderTop:`2px dashed ${C.clay}` }} />spending need</span>
              </div>
            </div>

            {/* Balance with vs without SS */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 14px 12px", marginBottom:16 }}>
              <div style={{ padding:"0 4px 6px" }}>
                <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>The long run</div>
                <h3 style={{ margin:"2px 0 2px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:19 }}>How far the savings stretch</h3>
                <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>The green line is your plan as modeled ({s.ssMode==="full"?"full SS":`${Math.round(effHaircut*100)}% SS`}); the dashed line is the worst case where Social Security disappears entirely. With it your savings last {lastsTxt(simSS.depAge)}; without any SS, {lastsTxt(simNo.depAge)}.{sellDots.length>0?" The step up is an inherited home being sold.":""}</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={balRows} margin={{ top:6, right:14, left:4, bottom:0 }}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
                  <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
                  <Tooltip formatter={(v,n)=>[usd0(v), n==="withSS"?"With SS":"Without SS"]} labelFormatter={(a)=>`Age ${a}`} contentStyle={{ borderRadius:8, border:`1px solid ${C.line}`, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }} />
                  <Line type="monotone" dataKey="withSS" stroke={C.viridian} strokeWidth={2.6} dot={false} name="withSS" />
                  <Line type="monotone" dataKey="withoutSS" stroke={C.clay} strokeWidth={2} strokeDasharray="5 4" dot={false} name="withoutSS" />
                  {sellDots.map((d,i)=><ReferenceDot key={i} x={d.age} y={d.bal} r={4} fill={C.brass} stroke="#fff" strokeWidth={1.5} />)}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:16, padding:"6px 6px 2px" }}>
                <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.viridian, borderRadius:2 }} />With Social Security</span>
                <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.clay, borderRadius:2 }} />Without</span>
              </div>
            </div>

            {/* Atlas */}
            <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px 20px", marginBottom:16 }}>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>The atlas</div>
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
                      <div className="rc-loc" onClick={()=>setOpenLoc(open?null:l.name)} style={{ padding:"8px", borderRadius:9, cursor:"pointer" }}>
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
                      </div>
                      {open && (
                        <div className="rc-exp" style={{ padding:"4px 12px 14px" }}>
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
                      <td style={{ padding:"5px 0", color:isHC?C.brassDeep:C.inkSoft, fontWeight:isHC?600:400 }}>{label.replace(" — before 65 (ACA)","").replace(" — 65+ (Medicare/local)","")}{isHC?` (${stage==="pre"?"<65":"65+"})`:""}</td>
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
                ["Social Security is a risk you can size, not a coin flip.","Current law projects a ~19–23% shortfall around 2033–34 if Congress does nothing, not a shutoff — and lawmakers have always acted before. The funding control lets you stress-test it; because her pension and your savings carry most of the load, even the 81% case leaves you close to plan. Delaying a claim to 70 also hardens the survivor's check against any cut."],
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

            <p style={{ fontSize:11, color:C.mut, lineHeight:1.5, marginTop:16 }}>
              Estimates for planning only — not financial, tax, or legal advice. Figures are in today's dollars; breakdowns also show a
              future-dollar equivalent. Inheritance outcomes use simplified net factors (Texas ~93% on sale via basis step-up; Austria ~90%
              after transfer + capital-gains tax) and assume the estate stays under the $15M federal exemption — confirm the decedent's
              acquisition history, currency basis, and treaty treatment with a cross-border tax professional. 2026 federal brackets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
