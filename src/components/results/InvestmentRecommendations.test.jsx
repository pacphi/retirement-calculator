import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvestmentRecommendations } from "./InvestmentRecommendations.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";

describe("InvestmentRecommendations", () => {
  it("shows the accumulation heading and a moderate-tier fund when still working", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/accumulation/i)).toBeInTheDocument();
    expect(screen.getByText("VOO")).toBeInTheDocument();
  });

  it("shows both phase headings during the retirement-transition year", () => {
    const s = { ...makeDefaultPlan(), ageA: 66, stopA: 65, ageB: 55, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/accumulation/i)).toBeInTheDocument();
    expect(screen.getByText(/decumulation/i)).toBeInTheDocument();
  });

  it("omits accredited-only funds when accreditedInvestor is false", () => {
    const s = { ...makeDefaultPlan(), riskTolerance: "aggressive", accreditedInvestor: false, ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.queryByText("BXPE")).not.toBeInTheDocument();
  });

  it("includes accredited-only funds when accreditedInvestor is true", () => {
    const s = { ...makeDefaultPlan(), riskTolerance: "aggressive", accreditedInvestor: true, ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText("BXPE")).toBeInTheDocument();
  });

  it("shows a per-account breakdown when accounts are present", () => {
    const s = {
      ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62,
      investmentAccounts: [{ id: "a1", name: "Fidelity 401(k)", type: "401k", balance: 50000 }],
    };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText("Fidelity 401(k)")).toBeInTheDocument();
  });

  it("shows a fallback message when there are no accounts", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62, investmentAccounts: [] };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/add accounts/i)).toBeInTheDocument();
  });

  it("always renders the planning-grade disclaimer", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/not a fiduciary recommendation/i)).toBeInTheDocument();
  });

  it("shows only the accumulation heading when still working and preview is off", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62, previewBothPhases: false };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/accumulation/i)).toBeInTheDocument();
    expect(screen.queryByText(/decumulation/i)).not.toBeInTheDocument();
  });

  it("shows both phase headings when still working and preview is on", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62, previewBothPhases: true };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByRole("heading", { level: 4, name: /accumulation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: /decumulation/i })).toBeInTheDocument();
  });

  it("notes that the second phase is a preview, not the household's actual phase", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62, previewBothPhases: true };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/previewing both phases/i)).toBeInTheDocument();
  });

  it("does not show the preview note during a genuine retirement-transition year", () => {
    const s = { ...makeDefaultPlan(), ageA: 66, stopA: 65, ageB: 55, stopB: 62, previewBothPhases: false };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/accumulation/i)).toBeInTheDocument();
    expect(screen.getByText(/decumulation/i)).toBeInTheDocument();
    expect(screen.queryByText(/previewing both phases/i)).not.toBeInTheDocument();
  });
});
