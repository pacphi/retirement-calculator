import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { C, CHROME, inputStyle, FONTS } from "../theme.js";

/* The "Nest & Next" mark: two birds in a woven nest, with an arrow looking ahead.
   Drawn with the same 2px rounded-stroke language as the app's icon set. */
export function NestLogo({ size = 46 }) {
  const w = (size * 58) / 40;
  return (
    <svg width={w} height={size} viewBox="0 0 58 40" fill="none" role="img"
      aria-label="Nest and Next logo" style={{ flexShrink:0, display:"block" }}>
      {/* the look-ahead arrow */}
      <path d="M42 20 H53" stroke="var(--header-accent)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M48.5 14.8 L53.6 20 L48.5 25.2" stroke="var(--header-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* nest bowl — three woven arcs, brass */}
      <path d="M6 23 C8 33.5 13.5 37.5 19.5 37.5 C25.5 37.5 31 33.5 33 23" stroke="var(--header-accent)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8.5 26.5 Q19.5 31.5 30.5 26.5" stroke="var(--header-accent)" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
      <path d="M11.5 30.5 Q19.5 33.5 27.5 30.5" stroke="var(--header-accent)" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
      {/* the couple — two rounded birds, facing each other */}
      <g fill="var(--header-pos)">
        <ellipse cx="15.5" cy="17.5" rx="3.6" ry="5" />
        <circle cx="15.5" cy="10.6" r="2.9" />
      </g>
      <g fill="var(--header-ink)">
        <ellipse cx="24.5" cy="17.5" rx="3.6" ry="5" />
        <circle cx="24.5" cy="10.6" r="2.9" />
      </g>
    </svg>
  );
}

/* Chevron used by the header collapse/expand toggle. */
export function Chevron({ up }) {
  return (
    <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true"
      style={{ transition:"transform .2s ease", transform: up ? "rotate(180deg)" : "none" }} />
  );
}

/* ---------------------------- UI atoms ---------------------------- */
export function Field({ label, hint, children }) {
  return (<label style={{ display:"block", marginBottom:16 }}>
    <span style={{ display:"block", fontSize:13, fontWeight:600, color:C.ink, marginBottom:6 }}>{label}</span>
    {children}
    {hint && <span style={{ display:"block", fontSize:12, color:C.mut, marginTop:5, lineHeight:1.5, maxWidth:"68ch" }}>{hint}</span>}
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
    {prefix && <span style={{ position:"absolute", left:12, fontFamily:FONTS.mono, color:C.slate, fontSize:14 }}>{prefix}</span>}
    <input type="number" value={display} min={min} {...rest}
      onChange={(e)=>{ setDraft(e.target.value); onChange(e.target.value===""?"":Number(e.target.value)); }}
      onBlur={commit}
      style={{ ...inputStyle, paddingLeft: prefix?24:12, paddingRight: suffix?34:12 }} />
    {suffix && <span style={{ position:"absolute", right:12, fontFamily:FONTS.mono, color:C.slate, fontSize:13 }}>{suffix}</span>}
  </div>);
}
export function Select({ value, onChange, options, "aria-label": ariaLabel }) {
  return (<select aria-label={ariaLabel} value={value} onChange={(e)=>onChange(e.target.value)} style={{ ...inputStyle, fontFamily:FONTS.body, fontWeight:600, fontSize:13.5, cursor:"pointer" }}>
    {options.map(o => { const opt = (o && typeof o === "object") ? o : { value:o, label:o }; return <option key={opt.value} value={opt.value}>{opt.label}</option>; })}
  </select>);
}
export function Segmented({ value, onChange, options, "aria-label": ariaLabel }) {
  // Quiet iOS-style segments: a recessed track, the active segment lifted on a
  // surface chip — selection reads from position and weight, not a filled slab.
  // Every button gets its own aria-label (= its visible text): Field wraps its children
  // in a native <label>, and per HTML's implicit label-association rule a <label> only
  // associates with the FIRST labelable descendant — without this, that first button's
  // accessible name gets swallowed by the wrapping label's full text (label + hint)
  // instead of its own option text. An explicit aria-label wins over that association.
  return (<div role={ariaLabel ? "group" : undefined} aria-label={ariaLabel} style={{ display:"flex", flex:"1 1 auto", minWidth:0, gap:3, background:"var(--track)", padding:3, borderRadius:10, border:`1px solid ${C.line}` }}>
    {options.map(o => { const on=value===o.value; return (
      <button key={String(o.value)} type="button" aria-pressed={on} aria-label={o.label} onClick={()=>onChange(o.value)} style={{ flex:1, minWidth:0, padding:"8px 10px", border:"1px solid", borderColor: on ? C.line : "transparent", borderRadius:7, cursor:"pointer", whiteSpace:"normal", textAlign:"center", lineHeight:1.25, fontSize:12.5, fontWeight:600, fontFamily:"inherit", background:on?CHROME.segActive:"transparent", color:on?C.ink:C.slate, boxShadow:on?"0 1px 2px rgba(10,20,16,.10)":"none", transition:"background .15s, color .15s, box-shadow .15s" }}>{o.label}</button>
    ); })}
  </div>);
}
export function Section({ eyebrow, title, children }) {
  return (<section style={{ marginBottom:28 }}>
    <div style={{ fontSize:11, letterSpacing:1.8, textTransform:"uppercase", color:C.brassDeep, fontWeight:700, marginBottom:4 }}>{eyebrow}</div>
    <h3 style={{ margin:"0 0 16px", fontFamily:FONTS.serif, fontSize:22, fontWeight:500, color:C.ink }}>{title}</h3>
    {children}
  </section>);
}
