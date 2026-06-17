import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig({
  // Project Pages serve from https://pacphi.github.io/retirement-calculator/,
  // so built asset URLs must be prefixed with that sub-path.
  base: "/retirement-calculator/",
  plugins: [react()],
  // Surface the package.json version to the app at build time. Substituted as a
  // string literal in both `vite build` and `vitest`, so the UI and tests agree.
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
  },
});
