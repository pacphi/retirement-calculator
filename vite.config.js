import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Project Pages serve from https://pacphi.github.io/retirement-calculator/,
  // so built asset URLs must be prefixed with that sub-path.
  base: "/retirement-calculator/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
  },
});
