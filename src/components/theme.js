/**
 * Theme system — one source of truth for every color in the app.
 *
 * All exported color values are CSS custom-property references (`var(--…)`), so
 * light and dark themes swap in one place: THEME_CSS defines the variables for
 * light (default), dark via `prefers-color-scheme`, and explicit overrides via
 * `data-theme="light" | "dark"` stamped on <html> by the header toggle.
 *
 * The palette is the colorblind-validated set from the 2026-07 audit follow-up
 * (worst adjacent CVD ΔE 24.2 in light mode; dark steps validated against the
 * dark surface). Categorical hues are assigned to ENTITIES, fixed across charts:
 *   c1 blue = salary/primary balance · c2 aqua = pension/contributions
 *   c3 yellow = Social Security (you) / RMD recycling · c4 green = SS (spouse)
 *   c5 violet = portfolio withdrawal/surplus reinvest · c6 red = danger/taxes
 *   c7 magenta = travel & one-time · c8 orange = rental/outflow
 * Never concatenate alpha onto these values (they are var() strings, not hex) —
 * use `color-mix(in srgb, var(--x) N%, transparent)` for tints.
 */

const LIGHT = `
  --page: #f9f9f7; --surface: #fcfcfb; --surface-2: #f3f2ec; --track: #ecebe4; --track-fill: #d6d4c9;
  --ink: #0b0b0b; --ink-soft: #33322f; --slate: #52514e; --mut: #898781;
  --line: #e1e0d9; --axis: #c3c2b7;
  --header-bg: #101211; --header-ink: #f4f4ef; --header-mut: #b9b8ad; --header-accent: #86b6ef;
  --on-ink: #fcfcfb; --on-accent: #ffffff; --header-pos: #5bd6a8; --header-neg: #f09b82;
  --accent: #2a78d6; --accent-deep: #1c5cab; --pos: #1baf7a; --neg: #d03b3b;
  --c1: #2a78d6; --c1-soft: #86b6ef; --c1-deep: #1c5cab;
  --c2: #1baf7a; --c3: #eda100; --c4: #008300; --c5: #4a3aa7;
  --c6: #e34948; --c7: #e87ba4; --c8: #eb6834;
  --b-deferred: #104281; --b-taxable: #86b6ef; --b-roth: #1baf7a;
  color-scheme: light;
`;

const DARK = `
  --page: #0d0d0d; --surface: #1a1a19; --surface-2: #222221; --track: #2c2c2a; --track-fill: #44443f;
  --ink: #ffffff; --ink-soft: #e4e3da; --slate: #c3c2b7; --mut: #898781;
  --line: #2c2c2a; --axis: #383835;
  --header-bg: #161717; --header-ink: #f4f4ef; --header-mut: #a3a297; --header-accent: #86b6ef;
  --on-ink: #0b0b0b; --on-accent: #ffffff; --header-pos: #5bd6a8; --header-neg: #f09b82;
  --accent: #3987e5; --accent-deep: #86b6ef; --pos: #199e70; --neg: #e66767;
  --c1: #3987e5; --c1-soft: #b7d3f6; --c1-deep: #5598e7;
  --c2: #199e70; --c3: #c98500; --c4: #008300; --c5: #9085e9;
  --c6: #e66767; --c7: #d55181; --c8: #d95926;
  --b-deferred: #184f95; --b-taxable: #b7d3f6; --b-roth: #199e70;
  color-scheme: dark;
`;

export const THEME_CSS = `
  :root { ${LIGHT} }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${DARK} } }
  :root[data-theme="dark"] { ${DARK} }
  :root[data-theme="light"] { ${LIGHT} }
  @media print { :root, :root[data-theme="dark"] { ${LIGHT} } }
  html, body { background: var(--page); }
`;

export const C = {
  ink: "var(--ink)", inkSoft: "var(--ink-soft)", paper: "var(--page)", panel: "var(--surface)",
  line: "var(--line)", brass: "var(--accent)", brassDeep: "var(--accent-deep)",
  viridian: "var(--pos)", clay: "var(--neg)", slate: "var(--slate)", mut: "var(--mut)",
};

// Income-source series — entity-fixed categorical assignments (see header note).
export const SRC = {
  salA: "var(--c1)", salB: "var(--c1-soft)", rent: "var(--c8)", pension: "var(--c2)",
  ssA: "var(--c3)", ssB: "var(--c4)", wd: "var(--c5)",
};

// Portfolio bucket series (one hue, ordinal shades) + flow series.
export const BUCKETS = { deferred: "var(--b-deferred)", taxable: "var(--b-taxable)", roth: "var(--b-roth)" };
export const FLOWS = {
  contrib: "var(--c2)", reinvest: "var(--c5)", rmdRecycle: "var(--c3)",
  growth: "var(--c1-soft)", spendDraw: "var(--c8)", forcedRmd: "var(--c6)",
};

// Text colors for content sitting ON an inverted or accent surface.
export const ON = { ink: "var(--on-ink)", accent: "var(--on-accent)" };

// Chrome tokens with no legacy alias in C.
export const CHROME = {
  surface2: "var(--surface-2)", track: "var(--track)", trackFill: "var(--track-fill)",
  axis: "var(--axis)",
  headerBg: "var(--header-bg)", headerInk: "var(--header-ink)",
  headerMut: "var(--header-mut)", headerAccent: "var(--header-accent)",
};

/** Translucent tint of any theme color — replaces the old `hex + "18"` trick. */
export const tint = (color, pct = 10) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const inputStyle = { width:"100%", boxSizing:"border-box", padding:"9px 11px", border:`1px solid ${C.line}`, borderRadius:8, fontSize:15, fontFamily:"'JetBrains Mono', monospace", color:C.ink, background:C.panel, outline:"none" };
export const FONTS = { body: "'Inter', system-ui, sans-serif", serif: "'Newsreader', serif", mono: "'JetBrains Mono', monospace" };
