export const travelSpendForYear = (travel, cal, retireCal) => {
  if (!travel || !travel.on) return 0;
  const amount = Number(travel.amount) || 0;
  const years = Number(travel.years) || 0;
  const idx = cal - retireCal; // 0-based year of retirement
  if (idx < 0 || idx >= years) return 0;
  if (travel.taper && idx >= 10) return 0.5 * amount;
  return amount;
};

export const oneTimeSpendForYear = (events, cal) =>
  (events || []).reduce(
    (sum, e) => (e && e.on && Number(e.year) === cal ? sum + (Number(e.amount) || 0) : sum),
    0,
  );

// One long-term-care episode keyed to the older spouse (ageA) reaching startAge,
// lasting `years`. Cost defaults to the selected location's annual private-care
// figure (locAnnual) unless an explicit `annual` override is set.
export const ltcSpendForYear = (ltc, aA, locAnnual = 0) => {
  if (!ltc || !ltc.on) return 0;
  const start = Number(ltc.startAge) || 0;
  const years = Number(ltc.years) || 0;
  if (aA < start || aA >= start + years) return 0;
  const override = Number(ltc.annual);
  const hasOverride = ltc.annual != null && ltc.annual !== "" && !Number.isNaN(override);
  return hasOverride ? override : (Number(locAnnual) || 0);
};
