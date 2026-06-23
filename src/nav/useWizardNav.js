import { useState, useCallback } from "react";

/**
 * useWizardNav — navigation-only state for the two-stage UX. Holds NO plan state.
 *
 *   mode             — "wizard" | "report"
 *   currentStepId    — id of the active input step
 *   completedStepIds — Set of step ids the user has visited (checkmark in the Stepper)
 *   reportSectionId  — id of the active report section
 *
 * @param {string[]} stepIds    ordered input step ids
 * @param {string[]} sectionIds ordered report section ids
 */
export function useWizardNav(stepIds, sectionIds) {
  const firstStep = stepIds[0];
  const firstSection = sectionIds[0];

  const [mode, setMode] = useState("wizard");
  const [currentStepId, setCurrentStepId] = useState(firstStep);
  const [visited, setVisited] = useState(() => new Set(firstStep ? [firstStep] : []));
  const [reportSectionId, setReportSectionId] = useState(firstSection);

  const idx = stepIds.indexOf(currentStepId);
  const isFirst = idx <= 0;
  const isLast = idx === stepIds.length - 1;

  const goToStep = useCallback((id) => {
    if (!stepIds.includes(id)) return;
    setCurrentStepId(id);
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(id);
      return nextSet;
    });
  }, [stepIds]);

  const next = useCallback(() => {
    const i = stepIds.indexOf(currentStepId);
    if (i >= 0 && i < stepIds.length - 1) goToStep(stepIds[i + 1]);
  }, [stepIds, currentStepId, goToStep]);

  const prev = useCallback(() => {
    const i = stepIds.indexOf(currentStepId);
    if (i > 0) goToStep(stepIds[i - 1]);
  }, [stepIds, currentStepId, goToStep]);

  const goToReport = useCallback(() => setMode("report"), []);
  const goToWizard = useCallback(() => setMode("wizard"), []);
  const goToSection = useCallback((id) => {
    if (sectionIds.includes(id)) setReportSectionId(id);
  }, [sectionIds]);

  return {
    mode, setMode, goToReport, goToWizard,
    currentStepId, goToStep, next, prev, isFirst, isLast,
    completedStepIds: visited,
    reportSectionId, goToSection,
  };
}
