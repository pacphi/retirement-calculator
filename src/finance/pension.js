import { DRS_ERF_30_PLUS, DRS_ERF_UNDER_30 } from "../retirementData.js";

export const pensionERF = (age, years, plan = 2) => {
  if (age >= 65) return 1;
  if (age < 55) return 0;
  if (years >= 30) return DRS_ERF_30_PLUS[Math.round(age)] ?? 0;
  const minEarlyYears = plan === 3 ? 10 : 20;
  if (years < minEarlyYears) return 0;
  return DRS_ERF_UNDER_30[Math.round(age)] ?? 0;
};

export const drsEligibilityNote = (age, years, plan = 2) => {
  if (plan === 2 && years < 5) return "Plan 2 generally needs 5 years of service to vest.";
  if (plan === 3 && years < 10) return "Plan 3 generally needs 10 years to vest, with limited exceptions.";
  if (age < 55) return "DRS retirement cannot start before age 55 in this simplified model.";
  if (age < 65 && years < (plan === 3 ? 10 : 20)) {
    return plan === 3
      ? "Plan 3 early retirement needs at least 10 years of service."
      : "Plan 2 early retirement before 65 needs at least 20 years of service.";
  }
  return "";
};

// AFC is the DRS member's (spouse / person B) average final compensation. When the
// user hasn't entered one, fall back to the spouse's current income: the model holds
// wages flat in real terms, so today's salary is the planning proxy for final-average
// pay. An explicit numeric entry always overrides the seed.
export const afcIsAuto = (i) => i.afc === null || i.afc === undefined || i.afc === "";
export const resolveAfc = (i) =>
  afcIsAuto(i) ? Number(i.incomeB) || 0 : Number(i.afc) || 0;
