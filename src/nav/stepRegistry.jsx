import { Household } from "../components/steps/Household.jsx";
import { Saving } from "../components/steps/Saving.jsx";
import { Housing } from "../components/steps/Housing.jsx";
import { Timing } from "../components/steps/Timing.jsx";
import { Pension } from "../components/steps/Pension.jsx";
import { RetirementPlace } from "../components/steps/RetirementPlace.jsx";
import { Inheritance as InheritanceStep } from "../components/steps/Inheritance.jsx";
import { SpendingStrategy } from "../components/steps/SpendingStrategy.jsx";
import { Milestones } from "../components/steps/Milestones.jsx";
import { TravelLongevity } from "../components/steps/TravelLongevity.jsx";
import { Advanced } from "../components/steps/Advanced.jsx";

/**
 * buildSteps(ctx) — the single source of truth for the input wizard. Returns ordered step
 * descriptors `{ id, num, title, render }`; each render() returns the EXISTING step
 * component unchanged (props supplied from ctx). Step 1 groups Household + Saving so the
 * Advanced/assumptions step lands at step 10 (per the requested "Advanced → step 10").
 *
 * @param {object} ctx all values the step components need (plan state, setters, derivations)
 */
export function buildSteps(ctx) {
  const { s, set, setProp } = ctx;
  return [
    {
      id: "household", num: 1, title: "Income",
      render: () => (
        <>
          <Household s={s} set={set} deferredMode={ctx.deferredMode} onDeferredModeChange={ctx.setDeferredMode} incomeHH={ctx.incomeHH} retireHousingAnnual={ctx.retireHousingAnnual} />
          <Saving s={s} set={set} />
        </>
      ),
    },
    { id: "housing", num: 2, title: "Housing", render: () => <Housing s={s} set={set} /> },
    { id: "timing", num: 3, title: "Timing", render: () => <Timing s={s} set={set} sFull={ctx.sFull} /> },
    { id: "pension", num: 4, title: "Pension", render: () => <Pension s={s} set={set} afcAuto={ctx.afcAuto} afcEff={ctx.afcEff} steady={ctx.steady} /> },
    { id: "place", num: 5, title: "Place", render: () => <RetirementPlace s={s} set={set} /> },
    { id: "inheritance", num: 6, title: "Inheritance", render: () => <InheritanceStep s={s} set={set} setProp={setProp} /> },
    { id: "spending", num: 7, title: "Spending", render: () => <SpendingStrategy s={s} set={set} setProp={setProp} addLifestyleStep={ctx.addLifestyleStep} removeLifestyleStep={ctx.removeLifestyleStep} setLifestyleStep={ctx.setLifestyleStep} /> },
    { id: "milestones", num: 8, title: "Milestones", render: () => <Milestones s={s} set={set} addEvent={ctx.addEvent} removeEvent={ctx.removeEvent} /> },
    { id: "travel", num: 9, title: "Travel", render: () => <TravelLongevity s={s} set={set} /> },
    { id: "advanced", num: 10, title: "Assumptions", render: () => <Advanced s={s} set={set} /> },
  ];
}
