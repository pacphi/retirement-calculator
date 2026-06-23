import { useState } from "react";
import { C, inputStyle } from "../theme.js";

/* The "Nest & Next" mark: two birds in a woven nest, with an arrow looking ahead. */
export function NestLogo({ size = 46 }) {
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
export function Chevron({ up }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transition:"transform .2s ease", transform: up ? "rotate(180deg)" : "none" }}>
      <path d="M3.5 6 L8 10.5 L12.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------- UI atoms ---------------------------- */
export function Field({ label, hint, children }) {
  return (<label style={{ display:"block", marginBottom:14 }}>
    <span style={{ display:"block", fontSize:12.5, fontWeight:600, color:C.ink, marginBottom:5 }}>{label}</span>
    {children}
    {hint && <span style={{ display:"block", fontSize:11, color:C.mut, marginTop:4, lineHeight:1.4 }}>{hint}</span>}
  </label>);
}
export function AssumptionIcon({ title }) {
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
export function NumberInput({ value, onChange, prefix, suffix, min, ...rest }) {
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
    <input type="number" value={display} min={min} {...rest}
      onChange={(e)=>{ setDraft(e.target.value); onChange(e.target.value===""?"":Number(e.target.value)); }}
      onBlur={commit}
      style={{ ...inputStyle, paddingLeft: prefix?22:11, paddingRight: suffix?34:11 }} />
    {suffix && <span style={{ position:"absolute", right:11, fontFamily:"'JetBrains Mono',monospace", color:C.slate, fontSize:13 }}>{suffix}</span>}
  </div>);
}
export function Select({ value, onChange, options, "aria-label": ariaLabel }) {
  return (<select aria-label={ariaLabel} value={value} onChange={(e)=>onChange(e.target.value)} style={{ ...inputStyle, fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:13.5, cursor:"pointer" }}>
    {options.map(o => { const opt = (o && typeof o === "object") ? o : { value:o, label:o }; return <option key={opt.value} value={opt.value}>{opt.label}</option>; })}
  </select>);
}
export function Segmented({ value, onChange, options, "aria-label": ariaLabel }) {
  return (<div role={ariaLabel ? "group" : undefined} aria-label={ariaLabel} style={{ display:"flex", flex:"1 1 auto", minWidth:0, gap:4, background:"#F1EEE5", padding:4, borderRadius:9 }}>
    {options.map(o => { const on=value===o.value; return (
      <button key={String(o.value)} type="button" aria-pressed={on} onClick={()=>onChange(o.value)} style={{ flex:1, minWidth:0, padding:"7px 8px", border:"none", borderRadius:6, cursor:"pointer", whiteSpace:"normal", textAlign:"center", lineHeight:1.2, fontSize:12, fontWeight:600, fontFamily:"inherit", background:on?C.ink:"transparent", color:on?"#fff":C.slate, transition:"all .15s" }}>{o.label}</button>
    ); })}
  </div>);
}
export function Section({ eyebrow, title, children }) {
  return (<section style={{ marginBottom:22 }}>
    <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700, marginBottom:3 }}>{eyebrow}</div>
    <h3 style={{ margin:"0 0 14px", fontFamily:"'Newsreader', serif", fontSize:20, fontWeight:500, color:C.ink }}>{title}</h3>
    {children}
  </section>);
}
