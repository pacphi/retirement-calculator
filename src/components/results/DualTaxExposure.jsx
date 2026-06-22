import { C } from "../theme.js";
import { SOURCES } from "../../retirementData.js";

/**
 * DualTaxExposure panel — shown when the active retirement location is international
 * (an INTL_TAX profile). Renders the profile's exposureNotes with source links and a
 * "consult a cross-border specialist" framing.
 *
 * Accessible label: "Cross-border tax exposure"
 *
 * @param {{ profile: object }} props  — an INTL_TAX entry (has .exposureNotes + .name)
 */
export function DualTaxExposure({ profile }) {
  if (!profile || !profile.isInternational || !profile.exposureNotes) return null;

  const notes = profile.exposureNotes;

  const items = [
    {
      key: "worldwide",
      label: "US worldwide taxation",
      text: notes.worldwide,
      href: SOURCES.irsFtc,
      linkLabel: "IRS Foreign Tax Credit",
    },
    {
      key: "govtPension",
      label: "Government pension — source rule",
      text: notes.govtPension,
      href: SOURCES.usModelTreaty,
      linkLabel: "US model treaty",
    },
    {
      key: "residenceTaxed",
      label: "Residence-country tax on IRA/401(k)",
      text: notes.residenceTaxed,
      href: SOURCES.irsFtc,
      linkLabel: "IRS Foreign Tax Credit",
    },
    {
      key: "filing",
      label: "Filing obligations (Form 3520 / FBAR / FATCA)",
      text: notes.filing,
      href: SOURCES.irsForm3520,
      linkLabel: "IRS Form 3520",
    },
  ].filter((item) => item.text);

  return (
    <section
      aria-label="Cross-border tax exposure"
      style={{
        background: "#FBF8F0",
        border: `1px solid ${C.brassDeep}44`,
        borderRadius: 14,
        padding: "16px 18px 18px",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700, marginBottom: 3 }}>
        Cross-border
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 20, color: C.ink }}>
        Dual-tax exposure — {profile.name}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>
        As a US citizen living abroad you remain subject to US federal tax on worldwide income.
        These are the key cross-border exposures for your chosen location. Figures in this
        planner are planning-grade estimates — <strong style={{ color: C.ink }}>consult a
        cross-border tax specialist</strong> before acting.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 9,
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{item.label}</span>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: C.brassDeep, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {item.linkLabel}
              </a>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>{item.text}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          padding: "9px 12px",
          background: "#F6F2E8",
          borderRadius: 8,
          fontSize: 11.5,
          color: C.slate,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: C.brassDeep }}>FBAR / FATCA reminders.</strong>{" "}
        Foreign bank accounts over $10k require annual FinCEN 114 (FBAR). FATCA thresholds
        are higher ($50k–$200k depending on status). Neither is a tax — they are reporting
        obligations with steep penalties for non-compliance.{" "}
        <a href={SOURCES.fbar} target="_blank" rel="noreferrer" style={{ color: C.brassDeep, fontWeight: 600 }}>
          IRS FBAR guide
        </a>.
      </div>
    </section>
  );
}
