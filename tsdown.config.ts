import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  dts: false,
  outExtensions: () => ({ js: ".js" }),
  deps: {
    // Bundle everything into one self-contained artifact, keeping only Node's built-ins external.
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
});
