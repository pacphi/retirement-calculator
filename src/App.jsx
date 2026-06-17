import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import RetirementCalculator from "../RetirementCalculator.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RetirementCalculator />
  </StrictMode>,
);
