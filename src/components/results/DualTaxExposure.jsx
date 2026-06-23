import { C } from "../theme.js";
import { SOURCES, US_STATE_TAX, INTL_TAX, LOCATIONS } from "../../retirementData.js";
import { residenceTaxForYear } from "../../finance/residenceTax.js";

/**
 * TaxResidency panel — "Tax & residency" facts for whatever retirement location is
 * selected. Generalized from the former international-only "Dual-tax exposure" panel:
 * it now renders for EVERY location and updates live as the selection changes.
 *
 *   - US state (stateCode set): state income-tax facts (rate, SS, pension exclusion,
 *     IRA/401(k), property tax) plus a plain-language residence-tax note.
 *   - International (INTL_TAX[retireLoc]): cross-border exposure cards (US worldwide tax,
 *     government-pension source rule, residence tax on deferred withdrawals, filing) plus
 *     the location's VAT/income-tax facts and an FBAR/FATCA reminder.
 *   - Any other LOCATIONS entry (e.g. a US region without a typed stateCode): its VAT /
 *     income-tax / planning facts.
 *
 * De-hardcoded: the government-pension card only appears when the household actually has a
 * pension (`s.pensionOn`); the Form-3520 inheritance line only when a foreign property is
 * inherited (`s.at?.on`). No country is special-cased.
 *
 * Accessible label: "Tax and residency"
 *
 * @param {{ s: object, steadyIncomeMix?: object }} props
 */
export function DualTaxExposure({ s, steadyIncomeMix }) {
  const usProfile = s?.stateCode ? US_STATE_TAX[s.stateCode] : null;
  const intlProfile = !s?.stateCode && s?.retireLoc ? INTL_TAX[s.retireLoc] : null;
  const loc = LOCATIONS.find((l) => l.name === s?.retireLoc) || null;
  const activeName = usProfile?.name || intlProfile?.name || loc?.name || s?.retireLoc;

  if (!usProfile && !intlProfile && !loc) return null;

  const taxNote = residenceNote(usProfile || intlProfile, steadyIncomeMix);

  // Compact per-location facts — works for US states and international locations alike.
  const facts = [];
  if (usProfile) {
    facts.push(["State income tax", usProfile.retireRate > 0 ? `~${(usProfile.retireRate * 100).toFixed(2)}% on the taxable base` : "None"]);
    facts.push(["Social Security", usProfile.taxesSS ? "Taxed by the state" : "Not taxed"]);
    facts.push(["Pension", usProfile.pensionExclusion === "full" ? "Fully excluded" : (usProfile.pensionExclusion ? `Excluded up to $${usProfile.pensionExclusion.toLocaleString()}` : "Taxed")]);
    facts.push(["IRA / 401(k) withdrawals", usProfile.taxesTradWithdrawal ? "Taxed" : "Not taxed"]);
    if (usProfile.propertyTaxRate) facts.push(["Property tax", `~${(usProfile.propertyTaxRate * 100).toFixed(2)}%/yr`]);
  }
  if (loc) {
    if (loc.vat) facts.push(["VAT / sales tax", loc.vat]);
    if (loc.incomeTax) facts.push(["Income tax", loc.incomeTax]);
  }

  const cards = intlProfile ? buildExposureCards(intlProfile, s) : [];

  return (
    <section
      aria-label="Tax and residency"
      style={{
        background: "#FBF8F0",
        border: `1px solid ${C.brassDeep}44`,
        borderRadius: 14,
        padding: "16px 18px 18px",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700, marginBottom: 3 }}>
        Tax &amp; residency
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 20, color: C.ink }}>
        {activeName}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>
        {intlProfile
          ? <>As a US citizen living abroad you remain subject to US federal tax on worldwide income. These are the key cross-border exposures for your chosen location — planning-grade estimates; <strong style={{ color: C.ink }}>consult a cross-border tax specialist</strong> before acting.</>
          : <>How your retirement income is taxed where you plan to live. Planning-grade estimates — state and local rules vary by county and change over time.</>}
      </p>

      {facts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: cards.length || taxNote ? 12 : 0 }}>
          {facts.map(([k, v]) => (
            <div key={k} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px" }}>
              <div style={{ fontSize: 10.5, color: C.slate, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.35 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {taxNote && (
        <div role="note" style={{ marginBottom: cards.length ? 12 : 0, padding: "9px 12px", background: "#F6F2E8", borderRadius: 8, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
          {taxNote}
        </div>
      )}

      {loc?.note && !intlProfile && (
        <div role="note" style={{ padding: "9px 12px", background: "#F6F2E8", borderRadius: 8, fontSize: 12, color: C.slate, lineHeight: 1.5 }}>
          {loc.note}
        </div>
      )}

      {cards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cards.map((item) => (
            <div key={item.key} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{item.label}</span>
                <a href={item.href} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.brassDeep, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {item.linkLabel}
                </a>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>{item.text}</p>
            </div>
          ))}
        </div>
      )}

      {intlProfile && (
        <div style={{ marginTop: 14, padding: "9px 12px", background: "#F6F2E8", borderRadius: 8, fontSize: 11.5, color: C.slate, lineHeight: 1.5 }}>
          <strong style={{ color: C.brassDeep }}>FBAR / FATCA reminders.</strong>{" "}
          Foreign bank accounts over $10k require annual FinCEN 114 (FBAR). FATCA thresholds
          are higher ($50k–$200k depending on status). Neither is a tax — they are reporting
          obligations with steep penalties for non-compliance.{" "}
          <a href={SOURCES.fbar} target="_blank" rel="noreferrer" style={{ color: C.brassDeep, fontWeight: 600 }}>
            IRS FBAR guide
          </a>.
        </div>
      )}
    </section>
  );
}

/**
 * Build the cross-border exposure cards from an INTL_TAX profile. The government-pension
 * card is dropped when the household has no pension; the filing card swaps to an
 * FBAR/FATCA-only message unless a foreign property is actually inherited.
 */
function buildExposureCards(profile, s) {
  const notes = profile.exposureNotes;
  if (!notes) return [];
  const filingText = s?.at?.on
    ? notes.filing
    : "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually.";
  return [
    { key: "worldwide", label: "US worldwide taxation", text: notes.worldwide, href: SOURCES.irsFtc, linkLabel: "IRS Foreign Tax Credit" },
    s?.pensionOn ? { key: "govtPension", label: "Government pension — source rule", text: notes.govtPension, href: SOURCES.usModelTreaty, linkLabel: "US model treaty" } : null,
    { key: "residenceTaxed", label: "Residence-country tax on IRA/401(k)", text: notes.residenceTaxed, href: SOURCES.irsFtc, linkLabel: "IRS Foreign Tax Credit" },
    { key: "filing", label: "Filing obligations (FBAR / FATCA" + (s?.at?.on ? " / Form 3520)" : ")"), text: filingText, href: SOURCES.irsForm3520, linkLabel: "IRS Form 3520" },
  ].filter(Boolean).filter((item) => item.text);
}

/**
 * Plain-language residence-tax note for the active profile, reusing residenceTaxForYear so
 * the wording matches the engine. Returns null when there is nothing typed to say.
 */
function residenceNote(profile, steadyIncomeMix) {
  if (!profile) return null;
  const { ss = 0, ssTaxablePortion, pension = 0, deferredWithdrawal = 0 } = steadyIncomeMix || {};
  const tax = residenceTaxForYear(profile, { isRetirement: true, ss, ssTaxablePortion, pension, deferredWithdrawal });

  if (tax <= 0) {
    if (profile.retireRate === 0) {
      return `${profile.name} adds no residence income tax on your Social Security, pension, or withdrawals.`;
    }
    return null;
  }
  const ssBase = profile.taxesSS ? (ssTaxablePortion ?? ss) : 0;
  const taxable = Math.max(0,
    ssBase
    + (profile.pensionExclusion === "full" ? 0 : Math.max(0, pension - (profile.pensionExclusion || 0)))
    + (profile.taxesTradWithdrawal ? deferredWithdrawal : 0),
  );
  return `${profile.name}: ~${(profile.retireRate * 100).toFixed(2)}% on ~$${Math.round(taxable / 1000)}k of your retirement income mix, adding ~$${Math.round(tax / 1000)}k/yr in residence tax (Social Security${profile.taxesSS ? " taxed" : " exempt"}, pension${profile.pensionExclusion === "full" ? " fully exempt" : " taxed"}).`;
}
