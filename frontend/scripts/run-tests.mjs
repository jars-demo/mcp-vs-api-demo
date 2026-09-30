// Runs the frontend tests with zero extra dependencies:
//   1. Vite bundles every src/**/*.test.ts(x) file for Node
//   2. Node's built-in test runner executes them
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";

// Must NOT be inside node_modules: on Linux/macOS `node --test` treats paths as
// glob patterns, and globs skip node_modules, so the tests would not be found.
const outDir = resolve(".test-build");

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return /\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// Flat, unique entry names (e.g. "lib__sse.test") so output paths are the same on every OS.
const tests = findTests("src");
const input = Object.fromEntries(
  tests.map((file) => [file.slice(4).replace(/\.tsx?$/, "").replace(/[\\/]/g, "__"), resolve(file)]),
);

const result = await build({
  logLevel: "warn",
  configFile: false,
  build: {
    ssr: true,
    outDir,
    emptyOutDir: true,
    rollupOptions: { input, output: { format: "es", entryFileNames: "[name].mjs" } },
  },
});

// Ask Vite which files it actually wrote instead of guessing their names.
const outputs = (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output);
const files = outputs.filter((chunk) => chunk.type === "chunk" && chunk.isEntry).map((chunk) => join(outDir, chunk.fileName));

if (files.length !== tests.length) {
  console.error(`Expected ${tests.length} test bundles, got ${files.length}:`, files);
  process.exit(1);
}

const run = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(run.status ?? 1);
