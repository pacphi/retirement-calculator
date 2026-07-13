import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { Investments } from "./Investments.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";

function setup(overrides = {}) {
  const s = { ...makeDefaultPlan(), ...overrides };
  const set = vi.fn((key) => vi.fn());
  const addAccount = vi.fn();
  const removeAccount = vi.fn();
  const setAccount = vi.fn(() => vi.fn());
  render(<Investments s={s} set={set} addAccount={addAccount} removeAccount={removeAccount} setAccount={setAccount} />);
  return { set, addAccount, removeAccount, setAccount };
}

describe("Investments step", () => {
  it("renders the risk tolerance options with moderate active by default", () => {
    setup();
    const moderate = screen.getByRole("button", { name: "Moderate" });
    expect(moderate).toHaveAttribute("aria-pressed", "true");
  });

  it("does not show the accreditation checkbox at moderate risk", () => {
    setup();
    expect(screen.queryByLabelText(/accredited investor/i)).not.toBeInTheDocument();
  });

  it("shows the accreditation checkbox when risk tolerance is aggressive", () => {
    setup({ riskTolerance: "aggressive" });
    expect(screen.getByLabelText(/accredited investor/i)).toBeInTheDocument();
  });

  it("renders an existing account's fields", () => {
    setup({ investmentAccounts: [{ id: "a1", name: "Fidelity 401(k)", type: "401k", balance: 50000 }] });
    expect(screen.getByDisplayValue("Fidelity 401(k)")).toBeInTheDocument();
  });

  it("calls addAccount when the add-account button is clicked", () => {
    const { addAccount } = setup();
    fireEvent.click(screen.getByRole("button", { name: /add account/i }));
    expect(addAccount).toHaveBeenCalledTimes(1);
  });

  it("calls removeAccount with the account's index when its remove button is clicked", () => {
    const { removeAccount } = setup({
      investmentAccounts: [{ id: "a1", name: "Fidelity 401(k)", type: "401k", balance: 50000 }],
    });
    fireEvent.click(screen.getByRole("button", { name: /remove account/i }));
    expect(removeAccount).toHaveBeenCalledWith(0);
  });

  it("shows a message when there are no accounts yet", () => {
    setup({ investmentAccounts: [] });
    expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument();
  });

  it("defaults the both-phases preview toggle to Off", () => {
    setup();
    const group = screen.getByRole("group", { name: "Preview both phases in the report" });
    const [off, on] = within(group).getAllByRole("button");
    expect(off).toHaveAttribute("aria-pressed", "true");
    expect(on).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects previewBothPhases: true as On", () => {
    setup({ previewBothPhases: true });
    const group = screen.getByRole("group", { name: "Preview both phases in the report" });
    const [off, on] = within(group).getAllByRole("button");
    expect(off).toHaveAttribute("aria-pressed", "false");
    expect(on).toHaveAttribute("aria-pressed", "true");
  });

  it("calls the previewBothPhases setter with true when toggled to On", () => {
    const { set } = setup();
    const group = screen.getByRole("group", { name: "Preview both phases in the report" });
    const [, on] = within(group).getAllByRole("button");
    fireEvent.click(on);
    const callIdx = set.mock.calls.findIndex(([key]) => key === "previewBothPhases");
    expect(callIdx).toBeGreaterThan(-1);
    expect(set.mock.results[callIdx].value).toHaveBeenCalledWith(true);
  });
});
