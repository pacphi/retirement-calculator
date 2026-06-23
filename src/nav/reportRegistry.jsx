import { C } from "../components/theme.js";
import { SOURCES } from "../retirementData.js";
import { Staircase } from "../components/charts/Staircase.jsx";
import { YearByYear } from "../components/charts/YearByYear.jsx";
import { PortfolioFlows } from "../components/charts/PortfolioFlows.jsx";
import { LongRun } from "../components/charts/LongRun.jsx";
import { RealizedSpending } from "../components/charts/RealizedSpending.jsx";
import { Places } from "../components/charts/Places.jsx";
import { Compare } from "../components/charts/Compare.jsx";
import { IncomeMix } from "../components/charts/IncomeMix.jsx";
import { HeadroomCard } from "../components/results/HeadroomCard.jsx";
import { AccumulationSummary } from "../components/results/AccumulationSummary.jsx";
import { Stats } from "../components/results/Stats.jsx";
import { RiskTable } from "../components/results/RiskTable.jsx";
import { Inheritance as InheritanceResult } from "../components/results/Inheritance.jsx";
import { DualTaxExposure } from "../components/results/DualTaxExposure.jsx";

/**
 * buildReportSections(ctx) — single source of truth for the generated report. Groups the
 * existing result/chart components into ordered, navigable sections `{ id, num, title,
 * render }`. The headline verdict is pinned separately by ReportShell, so it is not
 * repeated here. Every render() returns existing components unchanged (props from ctx).
 */
export function buildReportSections(ctx) {
  const { s } = ctx;
  return [
    {
      id: "verdict", num: 1, title: "Verdict",
      render: () => (
        <>
          <HeadroomCard headroom={ctx.headroom} horizon={ctx.horizon} />
          <Stats steady={ctx.steady} simSS={ctx.simSS} simNo={ctx.simNo} horizon={ctx.horizon} swr={s.swr} />
        </>
      ),
    },
    {
      id: "income", num: 2, title: "Income",
      render: () => (
        <>
          <Staircase
            compRows={ctx.compRows} depAge={ctx.simSS.depAge} floorAtDep={ctx.floorAtDep} needAtDep={ctx.needAtDep}
            hasRental={ctx.hasRental} pensionOn={s.pensionOn} spendBasis={s.spendBasis} retireLoc={s.retireLoc}
            onRetireLocChange={ctx.set("retireLoc")} ageA={s.ageA} onYbyOpen={ctx.setYbyOpen} onSelectYear={ctx.setSelYear}
            compTip={ctx.compTip} spendingShape={s.spendingShape} housing={s.housing} relocationYear={s.relocationYear} workLoc={s.workLoc}
            printWidth={ctx.printWidth}
          />
          <IncomeMix incomeStack={ctx.incomeStack} steadyGross={ctx.steady.gross} />
          <YearByYear
            rows={ctx.simSS.rows} depAge={ctx.depAge} inputs={s} selYear={ctx.selYear} onYearChange={ctx.setSelYear}
            playing={ctx.playing} onSetPlaying={ctx.setPlaying} view={ctx.ybyView} onViewChange={ctx.setYbyView}
            open={ctx.ybyOpen} onToggleOpen={() => ctx.setYbyOpen((o) => !o)} printWidth={ctx.printWidth}
          />
        </>
      ),
    },
    {
      id: "portfolio", num: 3, title: "Portfolio",
      render: () => (
        <>
          {ctx.yearsToRet > 0 && <AccumulationSummary accumulation={ctx.accumulation} retYear={ctx.retYear} />}
          <PortfolioFlows
            invRows={ctx.invRows} firstRmdAge={ctx.firstRmdAge} view={ctx.invView} onViewChange={ctx.setInvView}
            withdrawalOrder={s.withdrawalOrder} onWithdrawalOrderChange={ctx.set("withdrawalOrder")} printWidth={ctx.printWidth}
          />
          <LongRun
            balRows={ctx.balRows} sellDots={ctx.sellDots} mc={ctx.mc} mcRunning={ctx.mcRunning} onRunMc={ctx.runMc}
            horizon={ctx.horizon} ssMode={s.ssMode} effHaircut={ctx.effHaircut} mcSummaryLines={ctx.mcSummaryLines}
            showStress={s.showStress} hasShock={ctx.hasEmergent} printWidth={ctx.printWidth}
          />
          <RealizedSpending realizedSpending={ctx.mc?.realizedSpending ?? null} />
        </>
      ),
    },
    {
      id: "taxes", num: 4, title: "Taxes & Location",
      render: () => (
        <>
          <DualTaxExposure
            s={s}
            steadyIncomeMix={{
              ss: ctx.steady.ssHouse,
              ssTaxablePortion: ctx.steady.taxDetails?.taxableSocialSecurity,
              pension: ctx.steady.pension,
              deferredWithdrawal: ctx.steady.wd * (s.tradFrac || 0.7),
            }}
          />
          <Places
            locRows={ctx.locRows} steadyNet={ctx.steady.net} couple={ctx.couple} onCoupleChange={ctx.setCouple}
            stage={ctx.stage} onStageChange={ctx.setStage} openLoc={ctx.openLoc} onToggle={ctx.setOpenLoc}
            sFactor={ctx.sFactor} retYear={ctx.retYear} inflFactor={ctx.inflFactor} inflation={s.inflation}
            yearsToRet={ctx.yearsToRet} stateCode={s.stateCode} retireLoc={s.retireLoc}
            steadyIncomeMix={{
              ss: ctx.steady.ssHouse,
              ssTaxablePortion: ctx.steady.taxDetails?.taxableSocialSecurity,
              pension: ctx.steady.pension,
              deferredWithdrawal: ctx.steady.wd * (s.tradFrac || 0.7),
            }}
          />
          <Compare
            cmpA={ctx.cmpA} cmpB={ctx.cmpB} onPickA={ctx.setCmpA} onPickB={ctx.setCmpB} stage={ctx.stage}
            couple={ctx.couple} sFactor={ctx.sFactor} steadyNet={ctx.steady.net} inflFactor={ctx.inflFactor} retYear={ctx.retYear}
          />
        </>
      ),
    },
    {
      id: "risks", num: 5, title: "Risks",
      render: () => (
        <>
          <RiskTable
            sFull={ctx.sFull} sTrust={ctx.sTrust} sNone={ctx.sNone} simFull={ctx.simFull} simTrust={ctx.simTrust}
            simNone={ctx.simNone} s={s} effHaircut={ctx.effHaircut} horizon={ctx.horizon}
          />
          <InheritanceResult s={s} setProperty={ctx.setProperty} />
        </>
      ),
    },
    { id: "reference", num: 6, title: "Reference", render: () => <ReferenceSection s={s} /> },
  ];
}

/** Planner's notes + source links + disclaimer — moved verbatim from the root layout. */
function ReferenceSection({ s }) {
  return (
    <>
      <div style={{ background: "#F6F4EC", border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px" }}>
        <h3 style={{ margin: "0 0 10px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 18, color: C.ink }}>Planner's notes</h3>
        {[
          ["Texas: sell or rent, don't just hold.", "The US basis step-up wipes out capital-gains tax on a near-term sale, and Texas has no estate/inheritance/income tax — so selling nets ~93% of value, free to invest. Renting yields ~3.5% net. Living in it saves little because Texas property tax (~1.7%/yr) roughly equals the rent you'd avoid."],
          ["Klagenfurt: living in it is the prize.", "Austria charges no inheritance tax but ~1.85% to transfer, and a sale later is taxed 30% (or 4.2% of price if pre-2002) with no step-up — a tax the US foreign credit usually can't offset. But property tax is tiny, so living there replaces ~$1,650/mo of rent for ~$300, and a 5-of-10-year primary-residence history can exempt a future sale entirely."],
          ["Social Security is a risk you can size, not a coin flip.", "Current law projects a ~19–23% shortfall around 2033–34 if Congress does nothing, not a shutoff — and lawmakers have always acted before. The funding control lets you stress-test it; because the spouse's pension and your savings carry most of the load, even the 81% case leaves you close to plan. Delaying a claim to 70 also hardens the survivor's check against any cut."],
          ["The pre-65 healthcare cliff is now in the timeline.", "The dashed need line rises before 65 by the full-price ACA premium for your chosen retirement spot, then drops at Medicare age. Pick a US location and the bridge years cost ~$17k/yr more; pick Europe and it barely moves. Keeping taxable income modest in those years can unlock ACA subsidies."],
          ["File the paperwork.", "A foreign inheritance over $100k needs IRS Form 3520 (reporting only, but steep penalties if missed), plus FBAR/FATCA if you hold foreign accounts. None of these are taxes — just disclosures."],
          ["Cross-border tax is treaty territory.", "The US taxes you on worldwide income and gains; the US–Austria income and estate-tax treaties plus the foreign tax credit are what prevent double taxation. This is the one area to run past a cross-border specialist before acting."],
        ].map((n, idx, arr) => (
          <div key={idx} style={{ display: "flex", gap: 10, marginBottom: idx < arr.length - 1 ? 11 : 0 }}>
            <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: 99, background: C.brass, marginTop: 6 }} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: C.inkSoft }}><b style={{ color: C.ink }}>{n[0]}</b> {n[1]}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 18px", marginTop: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 18, color: C.ink }}>Source links</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>
          These are the main public sources behind the formulas. They are here so you can check the numbers yourself.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 12px", fontSize: 12.5 }}>
          {[
            ["IRS 2026 tax rules", SOURCES.irs2026],
            ["SSA benefit formula", SOURCES.ssaPia],
            ["SSA wage base", SOURCES.ssaWageBase],
            ["SSA spouse benefits", SOURCES.ssaRetirement],
            ["SSA trust funds", SOURCES.ssaTrustees],
            ["WA DRS pension", SOURCES.drsTrs2],
            ["KFF ACA premiums", SOURCES.kffAca],
            ["CMS Medicare", SOURCES.cmsMedicare],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" style={{ color: C.brassDeep, fontWeight: 700 }}>{label}</a>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 11, color: C.mut, lineHeight: 1.5, marginTop: 16 }}>
        Estimates for planning only — not financial, tax, or legal advice. Figures are in today's dollars; breakdowns also show a
        future-dollar equivalent. Inheritance outcomes use simplified net factors (Texas ~93% on sale via basis step-up; Austria ~90%
        after transfer + capital-gains tax) and assume the estate stays under the $15M federal exemption — confirm the decedent's
        acquisition history, currency basis, and treaty treatment with a cross-border tax professional. 2026 federal brackets. Inherited-home live-in savings begin the year after inheritance; one-time relocation costs are not modeled.
        {!s.ltc.on && " Long-term care is not modeled (about 70% of retirees need it; roughly $50k–$200k/yr depending on location) — enable it under Strategy & assumptions (step 10) to stress-test."}
      </p>
    </>
  );
}
