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

// Does a (possibly recurring) life event fire in this calendar year? With `everyYears`
// set it repeats from `year` on that cadence through `untilYear` (or the whole horizon if
// unset); without it, it is a one-time hit in `year`. Amounts are today's (real) dollars.
const eventFiresInYear = (e, cal) => {
  if (!e || !e.on) return false;
  const start = Number(e.year) || 0;
  if (cal < start) return false;
  const every = Number(e.everyYears) || 0;
  if (every > 0) {
    const until = e.untilYear != null && e.untilYear !== "" ? Number(e.untilYear) : Infinity;
    return cal <= until && (cal - start) % every === 0;
  }
  return cal === start;
};

export const scheduledSpendForYear = (events, cal, opts = {}) => {
  const includeEmergent = opts.includeEmergent ?? true;
  return (events || []).reduce((sum, e) => {
    if (!eventFiresInYear(e, cal)) return sum;
    if (e.emergent && !includeEmergent) return sum;
    const amt = Number(e.amount) || 0;
    return sum + (e.type === "windfall" ? -amt : amt);
  }, 0);
};

// Backwards-compatible alias: one-time events (no `everyYears`, no type) behave as before.
export const oneTimeSpendForYear = scheduledSpendForYear;

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
