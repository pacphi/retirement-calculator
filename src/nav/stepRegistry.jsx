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
import { Investments } from "../components/steps/Investments.jsx";

/**
 * buildSteps(ctx) — the single source of truth for the input wizard. Returns ordered step
 * descriptors `{ id, num, title, render }`; each render() returns the EXISTING step
 * component unchanged (props supplied from ctx). Step 1 groups Household + Saving; Investments
 * sits right after Income (step 2) since it's a natural extension of "how much you make and save."
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
    { id: "investments", num: 2, title: "Investments", render: () => <Investments s={s} set={set} addAccount={ctx.addAccount} removeAccount={ctx.removeAccount} setAccount={ctx.setAccount} /> },
    { id: "housing", num: 3, title: "Housing", render: () => <Housing s={s} set={set} /> },
    { id: "timing", num: 4, title: "Timing", render: () => <Timing s={s} set={set} sFull={ctx.sFull} /> },
    { id: "pension", num: 5, title: "Pension", render: () => <Pension s={s} set={set} afcAuto={ctx.afcAuto} afcEff={ctx.afcEff} steady={ctx.steady} /> },
    { id: "place", num: 6, title: "Retiring to", render: () => <RetirementPlace s={s} set={set} /> },
    { id: "inheritance", num: 7, title: "Real Estate", render: () => <InheritanceStep s={s} addProperty={ctx.addProperty} removeProperty={ctx.removeProperty} setProperty={ctx.setProperty} /> },
    { id: "spending", num: 8, title: "Spending", render: () => <SpendingStrategy s={s} set={set} setProp={setProp} addLifestyleStep={ctx.addLifestyleStep} removeLifestyleStep={ctx.removeLifestyleStep} setLifestyleStep={ctx.setLifestyleStep} /> },
    { id: "milestones", num: 9, title: "Milestones", render: () => <Milestones s={s} set={set} addEvent={ctx.addEvent} removeEvent={ctx.removeEvent} /> },
    { id: "travel", num: 10, title: "Travel", render: () => <TravelLongevity s={s} set={set} /> },
    { id: "advanced", num: 11, title: "Assumptions", render: () => <Advanced s={s} set={set} /> },
  ];
}
