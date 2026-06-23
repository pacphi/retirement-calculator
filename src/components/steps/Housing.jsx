import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { monthlyPI, payoffYear } from "../../finance/housing.js";
import { LOCATIONS, TAX_YEAR, US_STATE_TAX } from "../../retirementData.js";

/**
 * Step two — Your home today.
 *
 * Tenure selection (Rent / Mortgage / Own) with mode-specific inputs and a
 * live mortgage payoff read-out.
 *
 * Wave 2 Task 4: housing cost is now EXPLICIT and DEFAULT-ON in the spending
 * engine.  This component lets the user configure their housing situation so
 * the engine can compute the real annual cost each projection year.
 *
 * Accessible labels: "Housing", "Tenure", "Mortgage principal",
 *   "Mortgage rate", "Mortgage term".
 *
 * @param {{ s: object, set: function, setProp: function }} props
 */
export function Housing({ s, set }) {
  const h = s.housing ?? {
    tenure: "rent",
    rent: null,
    mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR },
    homeValue: 0,
    insuranceAnnual: 0,
    maintenancePct: 0.01,
  };

  const setHousing = (field) => (v) => set("housing")({ ...h, [field]: v });
  const setMortgage = (field) => (v) =>
    set("housing")({ ...h, mortgage: { ...h.mortgage, [field]: v } });

  const m = h.mortgage ?? { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR };
  const mpi = monthlyPI(m.principal, m.ratePct, m.termYears);
  const payoff = payoffYear(m);
  const yearsLeft = Math.max(0, payoff - TAX_YEAR);
  // Real monthly cost at payoff: in real terms P&I deflates to near zero, leaving
  // only property-tax / insurance / maintenance (owner obligations).
  const ownCostMo = Math.round(
    ((Number(s.activePropertyTaxRate) || 0) * (Number(h.homeValue) || 0)
      + (Number(h.insuranceAnnual) || 0)
      + (Number(h.maintenancePct) || 0.01) * (Number(h.homeValue) || 0)) / 12
  );

  // Property-tax read-out: shown when stateCode is set and homeValue > 0.
  // US_STATE_TAX carries propertyTaxRate for every US state; international = 0 (bundled in PROP.ownRate).
  const propTaxRate = (s.stateCode && US_STATE_TAX[s.stateCode]?.propertyTaxRate) || 0;
  const propTaxAnnual = propTaxRate * (Number(h.homeValue) || 0);
  const showPropTax = propTaxRate > 0 && (Number(h.homeValue) || 0) > 0;

  // ── Relocation home transition (Task 8) ──────────────────────────────────────
  // The work home is disposed of (sold / kept as a rental) at relocationYear ONLY when the
  // retirement jurisdiction differs from the work state AND the work home is owned/mortgaged.
  // Mirror the engine's jurisdiction comparison: workLoc vs (stateCode ?? retireLoc).
  // M1: mirrors the engine's jurisdiction resolution — the US retirement state code wins,
  // else the international retirement location name (same as activeJurisdiction in jurisdiction.js).
  const retireJurisdiction = s.stateCode ?? s.retireLoc;
  const workHomeOwned = h.tenure === "mortgage" || h.tenure === "own";
  const showRelocation = (s.workLoc ?? "WA") !== retireJurisdiction && workHomeOwned;

  const reloc = h.relocation ?? { action: "sell", saleValue: 0 };
  const setReloc = (field) => (v) =>
    set("housing")({ ...h, relocation: { ...reloc, [field]: v } });

  // Retirement-home config (the dwelling after relocation). Seed rent from the retire
  // location's basket when not yet set. Lives in top-level state as `retireHousing`.
  // M2: a RETIREMENT-home mortgage begins at relocation, not now — seed startYear from
  // relocationYear (fall back to TAX_YEAR only if unset) so remainingBalance/monthlyPI run
  // the amortization schedule from the move year, not 2026.
  const retLocObj = LOCATIONS.find((l) => l.name === s.retireLoc) || LOCATIONS[10];
  const retireMortgageStart = Number(s.relocationYear) || TAX_YEAR;
  const rh = s.retireHousing ?? {
    tenure: "rent",
    rent: retLocObj.m.rent,
    mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: retireMortgageStart },
    homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01,
  };
  const setRetireHousing = (field) => (v) => set("retireHousing")({ ...rh, [field]: v });
  const setRetireMortgage = (field) => (v) =>
    set("retireHousing")({ ...rh, mortgage: { ...(rh.mortgage ?? {}), [field]: v } });

  return (
    <Section eyebrow="Step two" title="Your home today">
      <Field label="Tenure">
        <Segmented
          value={h.tenure}
          onChange={setHousing("tenure")}
          options={[
            { value: "rent",     label: "Rent" },
            { value: "mortgage", label: "Mortgage" },
            { value: "own",      label: "Own outright" },
          ]}
        />
      </Field>

      {h.tenure === "rent" && (
        <Field
          label="Monthly rent"
          hint="Current monthly rent. Treated as real-flat in the projection (no inflation compounding)."
        >
          <NumberInput
            aria-label="Monthly rent"
            value={h.rent ?? ""}
            onChange={setHousing("rent")}
            prefix="$"
            min={0}
            step={50}
          />
        </Field>
      )}

      {h.tenure === "mortgage" && (
        <>
          <div className="rc-inputs">
            <Field label="Mortgage principal">
              <NumberInput
                aria-label="Mortgage principal"
                value={m.principal}
                onChange={setMortgage("principal")}
                prefix="$"
                min={0}
                step={1000}
              />
            </Field>
            <Field label="Mortgage rate">
              <NumberInput
                aria-label="Mortgage rate"
                value={m.ratePct}
                onChange={setMortgage("ratePct")}
                suffix="%"
                min={0}
                max={20}
                step={0.05}
              />
            </Field>
          </div>
          <div className="rc-inputs">
            <Field label="Mortgage term (years)">
              <NumberInput
                aria-label="Mortgage term"
                value={m.termYears}
                onChange={setMortgage("termYears")}
                suffix="yr"
                min={1}
                max={30}
                step={1}
              />
            </Field>
            <Field label="Loan start year">
              <NumberInput
                aria-label="Loan start year"
                value={m.startYear}
                onChange={setMortgage("startYear")}
                min={2000}
                max={2060}
                step={1}
              />
            </Field>
          </div>
          {mpi > 0 && (
            <div role="note" style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.55, marginBottom: 10, padding: "8px 10px", background: "#F6F2E8", borderRadius: 8 }}>
              Monthly P&amp;I <b style={{ color: C.ink }}>${Math.round(mpi).toLocaleString()}</b>
              {" · "}paid off <b style={{ color: C.ink }}>{payoff}</b>
              {yearsLeft > 0 ? ` (${yearsLeft} yr${yearsLeft !== 1 ? "s" : ""})` : " — already paid off"}
              {ownCostMo > 0 && (
                <>{" · "}≈&nbsp;<b style={{ color: C.ink }}>${ownCostMo.toLocaleString()}/mo</b> real carrying cost after payoff</>
              )}
              {showPropTax && (
                <>
                  <br />
                  Property tax ≈&nbsp;<b style={{ color: C.ink }}>${Math.round(propTaxAnnual).toLocaleString()}/yr</b>
                  {" "}({(propTaxRate * 100).toFixed(2)}% state rate)
                  <span style={{ color: C.mut }}>{" — "}county-local; state figure is a planning-grade approximation.</span>
                </>
              )}
            </div>
          )}
          <div className="rc-inputs">
            <Field label="Home value" hint="Used for property tax and maintenance estimates.">
              <NumberInput
                aria-label="Home value"
                value={h.homeValue}
                onChange={setHousing("homeValue")}
                prefix="$"
                min={0}
                step={10000}
              />
            </Field>
            <Field label="Annual insurance">
              <NumberInput
                aria-label="Annual homeowners insurance"
                value={h.insuranceAnnual}
                onChange={setHousing("insuranceAnnual")}
                prefix="$"
                min={0}
                step={100}
              />
            </Field>
          </div>
        </>
      )}

      {h.tenure === "own" && (
        <>
          <div className="rc-inputs">
            <Field label="Home value" hint="Used for property tax and maintenance estimates.">
              <NumberInput
                aria-label="Home value"
                value={h.homeValue}
                onChange={setHousing("homeValue")}
                prefix="$"
                min={0}
                step={10000}
              />
            </Field>
            <Field label="Annual insurance">
              <NumberInput
                aria-label="Annual homeowners insurance"
                value={h.insuranceAnnual}
                onChange={setHousing("insuranceAnnual")}
                prefix="$"
                min={0}
                step={100}
              />
            </Field>
          </div>
          {ownCostMo > 0 && (
            <div role="note" style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.55, marginBottom: 10, padding: "8px 10px", background: "#F6F2E8", borderRadius: 8 }}>
              Estimated carrying cost: ≈&nbsp;<b style={{ color: C.ink }}>${ownCostMo.toLocaleString()}/mo</b> (property tax + insurance + maintenance)
              {showPropTax && (
                <>
                  <br />
                  Property tax ≈&nbsp;<b style={{ color: C.ink }}>${Math.round(propTaxAnnual).toLocaleString()}/yr</b>
                  {" "}({(propTaxRate * 100).toFixed(2)}% state rate)
                  <span style={{ color: C.mut }}>{" — "}county-local; state figure is a planning-grade approximation.</span>
                </>
              )}
            </div>
          )}
        </>
      )}

      {showRelocation && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700, marginBottom: 8 }}>
            Relocation — work home
          </div>

          <Field
            label="Work home at relocation"
            hint="Your retirement state differs from your work state. Choose what happens to the work home when you move."
          >
            <Segmented
              value={reloc.action === "keep" ? "keep" : "sell"}
              onChange={setReloc("action")}
              options={[
                { value: "sell", label: "Sell at move" },
                { value: "keep", label: "Keep as rental" },
              ]}
            />
          </Field>

          {reloc.action === "keep" ? (
            <div role="note" style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.55, marginBottom: 12, padding: "8px 10px", background: "#F6F2E8", borderRadius: 8 }}>
              Kept as a rental — rental income is added and the work mortgage continues as a
              landlord cost. Property tax, insurance, and upkeep on the kept home are not yet
              modeled (planning-grade).
            </div>
          ) : (
            <>
              <Field
                label="Estimated sale value"
                hint="What the work home would sell for at relocation."
              >
                <NumberInput
                  aria-label="Estimated sale value"
                  value={reloc.saleValue ?? ""}
                  onChange={setReloc("saleValue")}
                  prefix="$"
                  min={0}
                  step={10000}
                />
              </Field>
              <div role="note" style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.55, marginBottom: 12, padding: "8px 10px", background: "#F6F2E8", borderRadius: 8 }}>
                You estimate the market value. ~7% selling costs and the remaining mortgage are
                netted out; the primary-residence capital-gains exclusion (~$500k MFJ) usually
                covers the gain — confirm with a specialist.
              </div>
            </>
          )}

          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700, margin: "14px 0 8px" }}>
            Retirement home
          </div>
          <Field label="Retirement home" hint="Where you live after relocating. Rent is seeded from the retirement location.">
            <Segmented
              value={rh.tenure}
              onChange={setRetireHousing("tenure")}
              options={[
                { value: "rent",     label: "Rent" },
                { value: "mortgage", label: "Mortgage" },
                { value: "own",      label: "Own outright" },
              ]}
            />
          </Field>

          {rh.tenure === "rent" && (
            <Field label="Retirement home rent (per month)" hint="Real-flat in the projection (no inflation compounding).">
              <NumberInput
                aria-label="Retirement home rent"
                value={rh.rent ?? ""}
                onChange={setRetireHousing("rent")}
                prefix="$"
                min={0}
                step={50}
              />
            </Field>
          )}

          {rh.tenure === "mortgage" && (
            <>
              <div className="rc-inputs">
                <Field label="Retirement mortgage principal">
                  <NumberInput aria-label="Retirement mortgage principal" value={rh.mortgage?.principal ?? 0} onChange={setRetireMortgage("principal")} prefix="$" min={0} step={1000} />
                </Field>
                <Field label="Retirement mortgage rate">
                  <NumberInput aria-label="Retirement mortgage rate" value={rh.mortgage?.ratePct ?? 0} onChange={setRetireMortgage("ratePct")} suffix="%" min={0} max={20} step={0.05} />
                </Field>
              </div>
              <div className="rc-inputs">
                <Field label="Retirement mortgage term (years)">
                  <NumberInput aria-label="Retirement mortgage term" value={rh.mortgage?.termYears ?? 0} onChange={setRetireMortgage("termYears")} suffix="yr" min={1} max={30} step={1} />
                </Field>
                <Field label="Retirement home value">
                  <NumberInput aria-label="Retirement home value" value={rh.homeValue ?? 0} onChange={setRetireHousing("homeValue")} prefix="$" min={0} step={10000} />
                </Field>
              </div>
            </>
          )}

          {rh.tenure === "own" && (
            <Field label="Retirement home value" hint="Used for property tax and maintenance estimates.">
              <NumberInput aria-label="Retirement home value" value={rh.homeValue ?? 0} onChange={setRetireHousing("homeValue")} prefix="$" min={0} step={10000} />
            </Field>
          )}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, margin: "0 0 4px" }}>
        Housing cost is added <b>outside</b> the 35% spending floor — it is treated as a hard
        obligation regardless of portfolio savings.
        {h.tenure === "mortgage" && " Mortgage P&I deflates in real terms; all other costs are real-flat."}
      </p>
    </Section>
  );
}
