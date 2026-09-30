// Runs the frontend tests with zero extra dependencies:
//   1. Vite bundles every src/**/*.test.ts(x) file for Node
//   2. Node's built-in test runner executes them
import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "vite";

const outDir = "node_modules/.tmp/tests";

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return /\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const tests = findTests("src");
const input = Object.fromEntries(tests.map((file) => [relative("src", file).replace(/\.tsx?$/, ""), file]));

rmSync(outDir, { recursive: true, force: true });
await build({
  logLevel: "warn",
  configFile: false,
  build: { ssr: true, outDir, emptyOutDir: true, rollupOptions: { input, output: { format: "es", entryFileNames: "[name].mjs" } } },
});

const files = Object.keys(input).map((name) => join(outDir, `${name}.mjs`));
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
