import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  fmt: {
    printWidth: 120,
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  staged: {
    "*.{js,mjs,cjs,ts,mts,cts,tsx}": "vp check --fix",
    "*.{md,json}": "vp fmt --write",
  },
  pack: {
    entry: ["src/index.ts"],
    target: "node22",
    dts: false,
    outExtensions: () => ({ js: ".js" }),
    deps: {
      // Bundle everything into one self-contained artifact, keeping only Node's built-ins
      // and the libsql family external — its native binding (@libsql/linux-x64-gnu etc.)
      // cannot be inlined and must be resolved from node_modules.
      alwaysBundle: (id) => !/^(@libsql\/|libsql$)/.test(id),
      onlyBundle: false,
    },
    copy: [{ from: "drizzle" }, { from: "locales" }],
  },
});
