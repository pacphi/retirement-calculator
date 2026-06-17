// Travel is budgeted by calendar year across a start..end window (both inclusive).
// With taper on it follows the classic go-go / slow-go curve: the full amount from
// startYear up to slowYear, then a reduced share (slowPct, default 50%) from
// slowYear through endYear. With taper off it's the full amount across the window.
export const travelSpendForYear = (travel, cal) => {
  if (!travel || !travel.on) return 0;
  const amount = Number(travel.amount) || 0;
  const start = Number(travel.startYear) || 0;
  const end = Number(travel.endYear) || 0;
  if (!start || !end || cal < start || cal > end) return 0;
  if (travel.taper) {
    const slow = Number(travel.slowYear) || (end + 1); // no slow phase if unset
    if (cal >= slow) {
      const pct = travel.slowPct != null && travel.slowPct !== "" ? Number(travel.slowPct) : 50;
      return amount * (pct / 100);
    }
  }
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
