export const usd0 = (x) => (x < 0 ? "-$" : "$") + Math.abs(Math.round(x)).toLocaleString();
export const usdK = (x) => (Math.abs(x) >= 1000 ? "$" + Math.round(x / 1000) + "k" : "$" + Math.round(x));
