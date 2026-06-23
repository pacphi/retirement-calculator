import { describe, expect, it } from "vitest";
import { residenceTaxForYear } from "./residenceTax.js";
import { US_STATE_TAX, INTL_TAX } from "../retirementData.js";

describe("residenceTaxForYear (flat fallback — Task 2)", () => {
  it("with no profile applies the flat rate to taxable income (identity with today)", () => {
    expect(residenceTaxForYear(null, { taxableIncome: 100000, flatRate: 0.05 })).toBeCloseTo(5000, 6);
  });
  it("zero rate ⇒ zero", () => {
    expect(residenceTaxForYear(null, { taxableIncome: 100000, flatRate: 0 })).toBe(0);
  });
});

describe("residenceTaxForYear (typed dispatch smoke test — Task 6)", () => {
  it("a typed profile dispatches to the typed branch, not the flat fallback", () => {
    // CA has retireRate 0.08 and taxesTradWithdrawal:true, pensionExclusion:0, taxesSS:false.
    // Flat fallback would apply 0.08 × taxableIncome; typed branch applies 0.08 × (pension+deferred).
    // With taxableIncome=200000 but pension+deferred=50000, only the typed branch gives 4000.
    const result = residenceTaxForYear(
      US_STATE_TAX.CA,
      { isRetirement: true, ss: 40000, pension: 30000, deferredWithdrawal: 20000, taxableIncome: 200000 },
    );
    // Typed: 0.08 × (0 + 30000 + 20000) = 4000; flat fallback would give 0.08 × 200000 = 16000.
    expect(result).toBeCloseTo(4000, 6);
  });
});

describe("residenceTaxForYear (US state typed cases — Task 6)", () => {
  it("a no-tax state yields zero on any retirement mix", () => {
    expect(
      residenceTaxForYear(US_STATE_TAX.WA, {
        isRetirement: true,
        ss: 40000,
        pension: 30000,
        deferredWithdrawal: 20000,
        taxableIncome: 90000,
      }),
    ).toBe(0);
  });

  it("CA taxes pension + deferred withdrawal but exempts SS", () => {
    const t = residenceTaxForYear(US_STATE_TAX.CA, {
      isRetirement: true,
      ss: 40000,
      pension: 30000,
      deferredWithdrawal: 20000,
      ssTaxablePortion: 34000,
    });
    // SS excluded (taxesSS:false), pensionExclusion:0 → full pension taxed, deferred taxed.
    expect(t).toBeCloseTo(0.08 * (30000 + 20000), 6);
  });

  it("IL exempts all retirement income", () => {
    expect(
      residenceTaxForYear(US_STATE_TAX.IL, {
        isRetirement: true,
        ss: 40000,
        pension: 30000,
        deferredWithdrawal: 20000,
      }),
    ).toBe(0);
  });

  it("taxes wages by the work-state rate in working years", () => {
    expect(
      residenceTaxForYear(US_STATE_TAX.CA, { isRetirement: false, wages: 100000 }),
    ).toBeCloseTo(8000, 6);
  });
});

describe("residenceTaxForYear (international typed cases — Task 6)", () => {
  it("a foreign profile exempts the govt (DRS) pension under the treaty but residence-taxes IRA draws", () => {
    // Wave 3 T7: Austria net-of-treaty 0→0.05 (verify). retireRate is now 0.05, not 0.
    // pensionExclusion "full" → pension excluded from base; taxesSS:false → SS excluded.
    // Only deferredWithdrawal is in the residence base: 0.05 × 20000 = 1000.
    const t = residenceTaxForYear(INTL_TAX["Austria"], {
      isRetirement: true,
      ss: 40000,
      pension: 30000,
      deferredWithdrawal: 20000,
    });
    expect(t).toBeCloseTo(0.05 * 20000, 6); // 0→0.05 re-baseline: was 0, now 1000

    // and the govt pension is excluded from the base regardless of rate:
    const t2 = residenceTaxForYear(
      { ...INTL_TAX["Austria"], retireRate: 0.1 },
      { isRetirement: true, ss: 40000, pension: 30000, deferredWithdrawal: 20000 },
    );
    // only the IRA draw is in the residence base; pension fully excluded, SS not taxed (taxesSS:false)
    expect(t2).toBeCloseTo(0.1 * 20000, 6);
  });
});
