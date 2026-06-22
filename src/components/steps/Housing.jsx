import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { monthlyPI, payoffYear } from "../../finance/housing.js";
import { TAX_YEAR } from "../../retirementData.js";

/**
 * Housing step — tenure selection (Rent / Mortgage / Own) with mode-specific
 * inputs and a live mortgage payoff read-out.
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

  return (
    <Section eyebrow="Housing" title="Housing">
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
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, margin: "0 0 4px" }}>
        Housing cost is added <b>outside</b> the 35% spending floor — it is treated as a hard
        obligation regardless of portfolio savings.
        {h.tenure === "mortgage" && " Mortgage P&I deflates in real terms; all other costs are real-flat."}
      </p>
    </Section>
  );
}
