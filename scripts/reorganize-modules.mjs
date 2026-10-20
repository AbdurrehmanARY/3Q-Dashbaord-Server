/**
 * reorganize-modules.mjs
 * Relocates module files per the requested layout and rewrites every import
 * specifier (relative and @modules/* alias) whose target moves.
 *
 * Layout:
 *   companies/brand.*   -> brands/
 *   inventory/material-receipts.* -> material-receipts/
 *   production/{batch-flow.*,production-run.*,resource-availability.service.ts} -> production/batch-and-runs/
 *   production/production-order.* + production-order-overview.builder.ts -> production/production-orders/
 *   production/woven-production.* -> production/woven-production/
 *   thread/{thread-dyeing,thread-inventory,thread-service-provider}.* -> thread/<name>/
 */
import fs from "node:fs";
import path from "node:path";
const ROOT = "d:/3Q-facility-Dashboard";
const SRC = path.join(ROOT, "server/src");
const posix = path.posix;
const SKIP_DIRS = new Set(["node_modules", "dist"]);
const MOVE = {};
MOVE["modules/companies/brand.controller.ts"] = "modules/brands/brand.controller.ts";
MOVE["modules/companies/brand.routes.ts"] = "modules/brands/brand.routes.ts";
MOVE["modules/companies/brand.schema.ts"] = "modules/brands/brand.schema.ts";
MOVE["modules/inventory/material-receipts.controller.ts"] = "modules/material-receipts/material-receipts.controller.ts";
MOVE["modules/inventory/material-receipts.repository.ts"] = "modules/material-receipts/material-receipts.repository.ts";
MOVE["modules/inventory/material-receipts.routes.ts"] = "modules/material-receipts/material-receipts.routes.ts";
MOVE["modules/inventory/material-receipts.schema.ts"] = "modules/material-receipts/material-receipts.schema.ts";
MOVE["modules/inventory/material-receipts.service.ts"] = "modules/material-receipts/material-receipts.service.ts";
MOVE["modules/production/batch-flow.controller.ts"] = "modules/production/batch-and-runs/batch-flow.controller.ts";
MOVE["modules/production/batch-flow.helpers.ts"] = "modules/production/batch-and-runs/batch-flow.helpers.ts";
MOVE["modules/production/batch-flow.helpers.test.ts"] = "modules/production/batch-and-runs/batch-flow.helpers.test.ts";
MOVE["modules/production/batch-flow.repository.ts"] = "modules/production/batch-and-runs/batch-flow.repository.ts";
MOVE["modules/production/batch-flow.routes.ts"] = "modules/production/batch-and-runs/batch-flow.routes.ts";
MOVE["modules/production/batch-flow.schema.ts"] = "modules/production/batch-and-runs/batch-flow.schema.ts";
MOVE["modules/production/batch-flow.service.ts"] = "modules/production/batch-and-runs/batch-flow.service.ts";
MOVE["modules/production/batch-flow.service.test.ts"] = "modules/production/batch-and-runs/batch-flow.service.test.ts";
MOVE["modules/production/production-run.controller.ts"] = "modules/production/batch-and-runs/production-run.controller.ts";
MOVE["modules/production/production-run.repository.ts"] = "modules/production/batch-and-runs/production-run.repository.ts";
MOVE["modules/production/production-run.schema.ts"] = "modules/production/batch-and-runs/production-run.schema.ts";
MOVE["modules/production/production-run.service.ts"] = "modules/production/batch-and-runs/production-run.service.ts";
MOVE["modules/production/resource-availability.service.ts"] = "modules/production/batch-and-runs/resource-availability.service.ts";
MOVE["modules/production/production-order.controller.ts"] = "modules/production/production-orders/production-order.controller.ts";
MOVE["modules/production/production-order.helpers.ts"] = "modules/production/production-orders/production-order.helpers.ts";
MOVE["modules/production/production-order.helpers.test.ts"] = "modules/production/production-orders/production-order.helpers.test.ts";
MOVE["modules/production/production-order.repository.ts"] = "modules/production/production-orders/production-order.repository.ts";
MOVE["modules/production/production-order.routes.ts"] = "modules/production/production-orders/production-order.routes.ts";
MOVE["modules/production/production-order.schema.ts"] = "modules/production/production-orders/production-order.schema.ts";
MOVE["modules/production/production-order.service.ts"] = "modules/production/production-orders/production-order.service.ts";
MOVE["modules/production/production-order-overview.builder.ts"] = "modules/production/production-orders/production-order-overview.builder.ts";
MOVE["modules/production/woven-production.controller.ts"] = "modules/production/woven-production/woven-production.controller.ts";
MOVE["modules/production/woven-production.helpers.ts"] = "modules/production/woven-production/woven-production.helpers.ts";
MOVE["modules/production/woven-production.helpers.test.ts"] = "modules/production/woven-production/woven-production.helpers.test.ts";
MOVE["modules/production/woven-production.repository.ts"] = "modules/production/woven-production/woven-production.repository.ts";
MOVE["modules/production/woven-production.routes.ts"] = "modules/production/woven-production/woven-production.routes.ts";
MOVE["modules/production/woven-production.schema.ts"] = "modules/production/woven-production/woven-production.schema.ts";
MOVE["modules/production/woven-production.service.ts"] = "modules/production/woven-production/woven-production.service.ts";
MOVE["modules/thread/thread-dyeing.controller.ts"] = "modules/thread/thread-dyeing/thread-dyeing.controller.ts";
MOVE["modules/thread/thread-dyeing.repository.ts"] = "modules/thread/thread-dyeing/thread-dyeing.repository.ts";
MOVE["modules/thread/thread-dyeing.routes.ts"] = "modules/thread/thread-dyeing/thread-dyeing.routes.ts";
MOVE["modules/thread/thread-dyeing.schema.ts"] = "modules/thread/thread-dyeing/thread-dyeing.schema.ts";
MOVE["modules/thread/thread-dyeing.service.ts"] = "modules/thread/thread-dyeing/thread-dyeing.service.ts";
MOVE["modules/thread/thread-inventory.controller.ts"] = "modules/thread/thread-inventory/thread-inventory.controller.ts";
MOVE["modules/thread/thread-inventory.repository.ts"] = "modules/thread/thread-inventory/thread-inventory.repository.ts";
MOVE["modules/thread/thread-inventory.routes.ts"] = "modules/thread/thread-inventory/thread-inventory.routes.ts";
MOVE["modules/thread/thread-inventory.schema.ts"] = "modules/thread/thread-inventory/thread-inventory.schema.ts";
MOVE["modules/thread/thread-inventory.service.ts"] = "modules/thread/thread-inventory/thread-inventory.service.ts";
MOVE["modules/thread/thread-service-provider.controller.ts"] = "modules/thread/thread-service-provider/thread-service-provider.controller.ts";
MOVE["modules/thread/thread-service-provider.repository.ts"] = "modules/thread/thread-service-provider/thread-service-provider.repository.ts";
MOVE["modules/thread/thread-service-provider.routes.ts"] = "modules/thread/thread-service-provider/thread-service-provider.routes.ts";
MOVE["modules/thread/thread-service-provider.schema.ts"] = "modules/thread/thread-service-provider/thread-service-provider.schema.ts";
MOVE["modules/thread/thread-service-provider.service.ts"] = "modules/thread/thread-service-provider/thread-service-provider.service.ts";
function walkTs(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "__tests__") continue;
    if (e.isDirectory()) { if (SKIP_DIRS.has(e.name)) continue; walkTs(path.join(dir, e.name), out); }
    else { out.push(path.relative(SRC, path.join(dir, e.name)).split(path.sep).join("/")); }
  }
  return out;
}

const TAB = String.fromCharCode(9);
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const WS = new Set([" ", TAB, CR, LF]);
const QUOTE = new Set(['"', "'"]);
const KW = ["from", "import", "require", "vi.mock", "import(", "mock("];

function stripTrailingWs(s) {
  let i = s.length;
  while (i > 0 && WS.has(s[i - 1])) i--;
  return s.slice(0, i);
}

function isImportSpec(before) {
  const tail = stripTrailingWs(before);
  for (let k = 0; k < KW.length; k++) if (tail.endsWith(KW[k])) return true;
  return false;
}

function resolveTarget(oldFile, spec) {
  if (spec.startsWith("@modules/")) {
    let base = spec.slice(9);
    if (base.endsWith(".ts")) base = base.slice(0, -3);
    else if (base.endsWith(".js")) base = base.slice(0, -3);
    const am = ["modules/" + base + ".ts", "modules/" + base + "/index.ts"];
    for (const cand of am) {
      if (fs.existsSync(path.join(SRC, cand))) return cand;
    }
    for (const cand of am) {
      const nc = MOVE[cand] || cand;
      if (nc !== cand && fs.existsSync(path.join(SRC, nc))) return nc;
    }
    return null;
  }
  if (spec.startsWith("@shared/") || spec.startsWith("@config/") || spec.startsWith("@db/")) return null;
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
    const dir = oldFile.slice(0, oldFile.lastIndexOf("/"));
    const base = posix.normalize(posix.join(dir, spec));
    const rc = [base + ".ts", base + "/index.ts"];
    for (const cand of rc) {
      if (fs.existsSync(path.join(SRC, cand))) return cand;
    }
    for (const cand of rc) {
      const nc = MOVE[cand] || cand;
      if (nc !== cand && fs.existsSync(path.join(SRC, nc))) return nc;
    }
    return null;
  }
  return null;
}

function rewritten(oldFile, content) {
  const newLoc = MOVE[oldFile] || oldFile;
  const newDir = newLoc.slice(0, newLoc.lastIndexOf("/"));
  let count = 0;
  let out = "";
  let last = 0;
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (QUOTE.has(ch)) {
      const q = ch;
      let j = i + 1;
      while (j < content.length && content[j] !== q) j++;
      out += content.slice(last, i);
      const spec = content.slice(i + 1, j);
      let appended = content.slice(i, j + 1);
      if (isImportSpec(content.slice(0, i))) {
        const t = resolveTarget(oldFile, spec);
        if (t) {
          const tNew = MOVE[t] || t;
          let repl;
          if (spec.startsWith("@modules/")) {
            let b = tNew;
            if (b.endsWith(".ts")) b = b.slice(0, -3);
            if (b.startsWith("modules/")) b = b.slice(8);
            repl = "@modules/" + b;
          } else {
            let rel = posix.relative(newDir, tNew);
            if (rel.endsWith(".ts")) rel = rel.slice(0, -3);
            if (spec.endsWith("/")) {
              if (rel.endsWith("/index")) rel = rel.slice(0, -6) + "/";
            }
            if (!rel.startsWith("./") && !rel.startsWith("../")) rel = "./" + rel;
            repl = rel;
          }
          if (repl !== spec) { appended = q + repl + q; count++; }
        }
      }
      out += appended;
      last = j + 1;
      i = j + 1;
    } else {
      i++;
    }
  }
  out += content.slice(last);
  return { newLoc, next: out, count };
}

const files = walkTs(SRC);
let rewrites = 0, deleted = 0, moved = 0;

for (const oldFile of files) {
  const absOld = path.join(SRC, oldFile);
  const content = fs.readFileSync(absOld, "utf8");
  const { newLoc, next, count } = rewritten(oldFile, content);
  if (count) rewrites += count;
  if (next !== content) {
    fs.writeFileSync(absOld, next, "utf8");
  }
  if (newLoc !== oldFile) {
    const absNew = path.join(SRC, newLoc);
    fs.mkdirSync(path.dirname(absNew), { recursive: true });
    fs.renameSync(absOld, absNew);
    moved++;
  }
}

console.log("files scanned: " + files.length);
console.log("import specifiers rewritten: " + rewrites);
console.log("files relocated: " + moved);





