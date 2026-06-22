import { C } from "../theme.js";
import { NumberInput, Segmented, Section } from "../atoms/index.jsx";

/**
 * Step five — Family milestones.
 *
 * @param {{ s: object, set: function, addEvent: function, removeEvent: function }} props
 */
export function Milestones({ s, set, addEvent, removeEvent }) {
  return (
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
  );
}
