import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Segmented } from "./index.jsx";

describe("Segmented", () => {
  it("gives every button its own accessible name, even the first, when wrapped in a native <label>", () => {
    // Field (used by every step component) wraps its children in a native <label>. Per
    // HTML's implicit label-association rule, a <label> associates with only the FIRST
    // labelable descendant — without its own aria-label, the first button's accessible
    // name gets swallowed by the wrapping label's full text instead of its own option text.
    render(
      <label>
        <span>Risk tolerance</span>
        <Segmented
          aria-label="Risk tolerance"
          value="moderate"
          onChange={() => {}}
          options={[
            { label: "Conservative", value: "conservative" },
            { label: "Moderate", value: "moderate" },
            { label: "Aggressive", value: "aggressive" },
          ]}
        />
        <span>Hint text that would otherwise pollute the first button&apos;s name.</span>
      </label>
    );
    expect(screen.getByRole("button", { name: "Conservative" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Moderate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aggressive" })).toBeInTheDocument();
  });
});
