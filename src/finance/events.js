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
