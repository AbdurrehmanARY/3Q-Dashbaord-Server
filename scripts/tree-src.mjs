// tree-src.mjs — compact tree of server/src (skips node_modules, __tests__, dist)
import fs from "node:fs";
import path from "node:path";
const ROOT = "d:/3Q-facility-Dashboard/server/src";
const SKIP = new Set(["node_modules", "__tests__", "dist"]);
function walk(dir, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const rel = path.relative(ROOT, path.join(dir, e.name));
    console.log("  ".repeat(depth) + "/ " + e.name + (e.isDirectory() ? "/" : ""));
  }
}
console.log("server/src/");
for (const e of fs.readdirSync(ROOT, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
  if (SKIP.has(e.name) || e.name === "src") continue;
  console.log(e.isDirectory() ? "/ " + e.name + "/" : "| " + e.name);
}
// depth-limited recursive (top 4 levels)
console.log("\n--- modules/ + shared/ (recursive, top 5 levels) ---");
function tree(dir, prefix, level) {
  if (level > 5) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name)); }
  catch { return; }
  const filtered = entries.filter(e => !SKIP.has(e.name));
  filtered.forEach((e, i) => {
    const isLast = i === filtered.length - 1;
    const branch = isLast ? "└── " : "├── ";
    console.log(prefix + branch + e.name + (e.isDirectory() ? "/" : ""));
    if (e.isDirectory()) tree(path.join(dir, e.name), prefix + (isLast ? "    " : "│   "), level + 1);
  });
}
tree(path.join(ROOT, "modules"), "", 0);
console.log("\n--- shared/ ---");
tree(path.join(ROOT, "shared"), "", 0);
