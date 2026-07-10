/**
 * Theme system — one source of truth for every color in the app.
 *
 * All exported color values are CSS custom-property references (`var(--…)`), so
 * light and dark themes swap in one place: THEME_CSS defines the variables for
 * light (default), dark via `prefers-color-scheme`, and explicit overrides via
 * `data-theme="light" | "dark"` stamped on <html> by the header toggle.
 *
 * "The Ledger" palette (2026-07 redesign): warm paper, deep pine ink, brass
 * accents — the visual language of a well-kept financial ledger. Chart series
 * were validated with the dataviz palette validator (Machado-2009 CVD ΔE):
 * light 8-slot set passes all checks on #FFFFFF (worst adjacent ΔE 15.6 protan);
 * dark 8-slot set passes on #171E1B (worst adjacent ΔE 14.1 protan). The one
 * documented exception: --c1-soft is a same-hue ordinal tint of --c1 (spouse
 * salary next to your salary), relieved by legend + 2px bar gaps per the
 * dataviz rules. Categorical hues are assigned to ENTITIES, fixed across charts:
 *   c1 blue = salary/primary balance · c2 viridian = pension/contributions
 *   c3 gold = Social Security (you) / RMD recycling · c4 green = SS (spouse)
 *   c5 violet = portfolio withdrawal/surplus reinvest · c6 red = danger/taxes
 *   c7 plum = travel & one-time · c8 sienna = rental/outflow
 * Never concatenate alpha onto these values (they are var() strings, not hex) —
 * use `color-mix(in srgb, var(--x) N%, transparent)` for tints.
 */

const LIGHT = `
  --page: #f7f5ee; --surface: #ffffff; --surface-2: #efece1; --track: #e7e3d5; --track-fill: #c9c3ae;
  --ink: #14231f; --ink-soft: #2e403a; --slate: #4e5b56; --mut: #67716c;
  --line: #e2decf; --axis: #b9b49e;
  --header-bg: #14231f; --header-ink: #f5f2e7; --header-mut: #abb8b1; --header-accent: #d9ae54;
  --on-ink: #f7f5ee; --on-accent: #ffffff; --header-pos: #5bd6a8; --header-neg: #f09b82;
  --accent: #a87a1c; --accent-deep: #7e5a12; --pos: #177e5b; --neg: #b34524;
  --seg-active: #ffffff;
  --c1: #3e6fb0; --c1-soft: #6e9dd8; --c1-deep: #2b5688;
  --c2: #1f8a68; --c3: #c28a00; --c4: #2e7d1e; --c5: #7263c9;
  --c6: #c24444; --c7: #c76a9e; --c8: #cb6120;
  --b-deferred: #2b5688; --b-taxable: #6e9dd8; --b-roth: #1f8a68;
  color-scheme: light;
`;

const DARK = `
  --page: #101512; --surface: #171e1b; --surface-2: #1d2521; --track: #27302b; --track-fill: #3c4741;
  --ink: #f2efe3; --ink-soft: #d8d4c4; --slate: #acb6af; --mut: #808b84;
  --line: #2a332d; --axis: #46524b;
  --header-bg: #121a16; --header-ink: #f2efe3; --header-mut: #9faca5; --header-accent: #d9ae54;
  --on-ink: #101512; --on-accent: #171e1b; --header-pos: #5bd6a8; --header-neg: #f09b82;
  --accent: #d9ae54; --accent-deep: #e5c075; --pos: #2e9e7e; --neg: #d66161;
  --seg-active: #3a453f;
  --c1: #4c86c8; --c1-soft: #a3c6ec; --c1-deep: #3e74b8;
  --c2: #2e9e7e; --c3: #b8881c; --c4: #55963c; --c5: #8f81db;
  --c6: #d66161; --c7: #bf6e9b; --c8: #ce6f2f;
  --b-deferred: #3e74b8; --b-taxable: #a3c6ec; --b-roth: #2e9e7e;
  color-scheme: dark;
`;

export const THEME_CSS = `
  :root { ${LIGHT} }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${DARK} } }
  :root[data-theme="dark"] { ${DARK} }
  :root[data-theme="light"] { ${LIGHT} }
  @media print { :root, :root[data-theme="dark"] { ${LIGHT} } }
  html, body { background: var(--page); accent-color: var(--accent); }
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
  segActive: "var(--seg-active)",
};

/** Translucent tint of any theme color — replaces the old `hex + "18"` trick. */
export const tint = (color, pct = 10) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const inputStyle = { width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1px solid ${C.line}`, borderRadius:8, fontSize:15, fontFamily:"'JetBrains Mono', monospace", color:C.ink, background:C.panel, outline:"none" };
export const FONTS = { body: "'Inter', system-ui, sans-serif", serif: "'Newsreader', serif", mono: "'JetBrains Mono', monospace" };

/** Serif money figure — the ledger's signature treatment for hero numbers. */
export const FIGURE = {
  fontFamily: FONTS.serif, fontWeight: 600, lineHeight: 1,
  fontVariantNumeric: "lining-nums tabular-nums", letterSpacing: "-0.5px",
};
