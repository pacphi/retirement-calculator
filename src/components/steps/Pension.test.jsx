import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pension } from "./Pension.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";

function setup(overrides = {}, afcAuto = false) {
  const s = { ...makeDefaultPlan(), pensionOn: true, ...overrides };
  const set = vi.fn((_key) => vi.fn());
  const steady = { pension: 24000, erf: 1, pensionNote: "" };
  render(<Pension s={s} set={set} afcAuto={afcAuto} afcEff={100000} steady={steady} />);
}

describe("Pension step — shared CompensationField/PensionResultBox regression guard", () => {
  // Regression guard: before the optimization-pass refactor, the "reset to assumed" link only
  // existed in the drs/fers blocks -- every other pensionType's compensation field was missing
  // it entirely. All 8 non-generic types now share one CompensationField component.
  it.each(["drs", "fers", "calstrs", "calpers", "txtrs", "nystrs", "ohiostrs", "military"])(
    "shows the compensation field with a value for pensionType=%s",
    (pensionType) => {
      setup({ pensionType, afc: null }); // afc:null -> afcAuto would be true upstream, but afcAuto is passed explicitly
      // Every non-generic type renders exactly one $/yr NumberInput for compensation.
      expect(screen.getByDisplayValue("100000")).toBeInTheDocument();
    }
  );

  it("shows the reset-to-assumed link when afcAuto is false for a non-drs/fers type (e.g. CalSTRS)", () => {
    setup({ pensionType: "calstrs" });
    expect(screen.getByText(/Reset to assumed \(spouse's income\)/)).toBeInTheDocument();
  });

  it("shows the auto-filled assumption note when afcAuto is true for a non-drs/fers type (e.g. military)", () => {
    setup({ pensionType: "military" }, true);
    expect(screen.getByText(/Assumed from the spouse's income/)).toBeInTheDocument();
  });

  it("renders the generic pension panel without a CompensationField (different field shape)", () => {
    setup({ pensionType: "generic", genericPensionMonthly: 3000 });
    expect(screen.getByLabelText(/Monthly pension benefit/)).toBeInTheDocument();
    expect(screen.queryByText(/Reset to assumed \(spouse's income\)/)).not.toBeInTheDocument();
  });
});
