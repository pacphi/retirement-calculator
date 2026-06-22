import { SMILE_DEFAULTS } from "../../retirementData.js";

const num = (v, d) => (v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);

/**
 * Age-shaped real-spending multiplier (Blanchett "retirement spending smile").
 * 1 until retirement, then a real decline through the active years bottoming at
 * `floor`, with a late-life upturn from `upturnAge`. Pure and deterministic.
 *
 * @param {number} age       - person A's age in the projection year
 * @param {number} retireAge - person A's retirement age (smile anchor)
 * @param {{mode:string, earlyDecline?:number, upturnAge?:number, lateUpturn?:number}} shape
 * @returns {number}
 */
export function smileMultiplier(age, retireAge, shape) {
  if (!shape || shape.mode === "flat" || age < retireAge) return 1;
  const decline = num(shape.earlyDecline, SMILE_DEFAULTS.earlyDecline);
  const upturnAge = num(shape.upturnAge, SMILE_DEFAULTS.upturnAge);
  const lateUpturn = num(shape.lateUpturn, SMILE_DEFAULTS.lateUpturn);
  const floor = SMILE_DEFAULTS.floor;
  if (age < upturnAge) {
    return Math.max(floor, 1 - decline * (age - retireAge));
  }
  const trough = Math.max(floor, 1 - decline * (upturnAge - retireAge));
  return Math.min(1, trough + lateUpturn * (age - upturnAge));
}
