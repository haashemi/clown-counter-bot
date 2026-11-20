import { defineOxlintConfig } from "@fullstacksjs/oxlint-config";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { tsconfigPaths: true },

  fmt: { printWidth: 120, ignorePatterns: ["dist/**", "drizzle/**"] },
  lint: defineOxlintConfig({
    modules: { nodejs: true, vitest: true },
    options: { esm: false },
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
