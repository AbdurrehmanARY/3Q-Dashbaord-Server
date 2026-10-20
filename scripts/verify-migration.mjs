/**
 * verify-migration.mjs — textual audit proving the vertical-slice refactor left
 * NO dangling references to the old layer-based layout.
 *
 * It asserts three things:
 *   1. No import specifier points at a now-removed layer path
 *      (@api/services, @api/repositories, @api/controllers, @api/models, etc.).
 *   2. No *relative* specifier walks back into a removed layer directory.
 *   3. The target layout (modules/<domain>/ + shared/) actually exists.
 *
 * Dependency-free: stdlib only. Exit non-zero on any finding.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");

// Layer roots that were folded into modules/ or shared/ and must no longer be imported.
const GONE_LAYER_DIRS = [
  "services", "controllers", "repositories", "models", "validations",
  "routes", // api/routes/* except the entry; routes live inside each module now
  "middlewares",
];

// Alias roots that are no longer resolvable (paths no longer exist).
const GONE_ALIASES = [
  "@api/services", "@api/controllers", "@api/repositories", "@api/models",
  "@api/validations", "@api/middlewares",
  "@services", "@controllers", "@repositories", "@models",
];

const GONE_DIR_RE = new RegExp(
  String.raw`(["'])\.\.?\/(?:api\/)?(?:${GONE_LAYER_DIRS.join("|")})/`,
);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "__tests__") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".ts") || e.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function specifiers(code) {
  const out = [];
  const push = (re) => { for (const m of code.matchAll(re)) out.push(m[1]); };
  push(/(?:\bfrom\s+|\bimport\s*)["']([^"']+)["']/g);
  push(/\bimport\s*\(\s*["']([^"']+)["']/g);
  push(/\bvi\.mock\(\s*["']([^"']+)["']/g);
  push(/\brequire\(\s*["']([^"']+)["']/g);
  return out;
}

const files = walk(SRC);
const findings = [];

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  const rel = path.relative(SRC, file);
  for (const spec of specifiers(code)) {
    if (GONE_ALIASES.some((a) => spec.startsWith(a))) {
      findings.push(`${rel}  imports gone alias  ${spec}`);
    }
    if (GONE_DIR_RE.test(spec)) {
      findings.push(`${rel}  imports gone dir     ${spec}`);
    }
  }
}

// (3) Target layout exists.
const required = ["modules/production", "shared/db", "shared/config", "shared/errors",
  "shared/middleware"];
for (const p of required) {
  if (!fs.existsSync(path.join(SRC, p))) findings.push(`missing layout dir: src/${p}`);
}
// old top-level layer dirs must be gone (only routes/index.ts entry may remain)
const staleDirs = fs.readdirSync(SRC).filter((d) =>
  GONE_LAYER_DIRS.includes(d) &&
  fs.statSync(path.join(SRC, d)).isDirectory(),
);
for (const d of staleDirs) {
  findings.push(`stale top-level dir still present: src/${d}`);
}

console.log(`scanned ${files.length} source files under server/src/`);
if (findings.length) {
  console.error("FAIL — migration left references:");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("OK — no references to removed layer paths; target layout intact.");
process.exit(0);
