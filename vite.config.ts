import { defineOxlintConfig } from "@fullstacksjs/oxlint-config";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { tsconfigPaths: true },

  fmt: { printWidth: 120, ignorePatterns: ["dist/**", "drizzle/**"] },
  // @ts-expect-error -- @fullstacksjs/oxlint-config bundles different oxlint types than vite-plus (TS2769); remove when versions align.
  lint: defineOxlintConfig({
    modules: { nodejs: true, vitest: true },
    options: { esm: false, typeAware: true, typeCheck: true },
    ignorePatterns: ["dist/**", "drizzle/**"],
  }),
  pack: {
    entry: ["src/index.ts"],
    deps: { alwaysBundle: [/.*/], onlyBundle: false },
    copy: [{ from: "drizzle" }, { from: "locales" }, { from: ".env.example" }],
  },
  staged: {
    "*.{ts,tsx}": "vp check --fix",
    "*.{md,json}": "vp fmt --write",
  },
});
