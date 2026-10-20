/**
 * Architecture guard tests — enforce the structural rules that keep the
 * vertical-slice layout safe. See implementation_spec.md §8/§9.
 *
 *  R2  no file-level (ESM) import cycles under src/
 *  R1a no repository imports a *.service.ts  (repositories must stay leaves)
 *  R1b cross-module repository -> repository imports must be explicitly
 *      allow-listed (they are safe only because both endpoints are leaves)
 *
 * Dependency-free: uses node:fs + node:path only.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.resolve(ROOT, "src");

/** Cross-module repo->repo edges that are known-safe (leaf -> leaf). */
const ALLOWED_CROSS_MODULE_REPO_EDGES = [
  "modules/production/woven-production/woven-production.repository.ts -> modules/thread/thread-inventory/thread-inventory.repository.ts",
];

function walkTs(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__" || e.name === "node_modules") continue;
      walkTs(full, out);
    } else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const rel = (abs: string) => path.relative(SRC, abs).split(path.sep).join("/");

/** Resolve an import specifier to a src-relative .ts path, or null if external. */
function resolve(importer: string, spec: string): string | null {
  const s = spec.replace(/\.(js|ts)$/, "");
  let base: string;
  const dir = path.posix.dirname(importer);
  if (s.startsWith("@modules/")) base = "modules/" + s.slice(9);
  else if (s.startsWith("@shared/")) base = "shared/" + s.slice(8);
  else if (s.startsWith("@db/")) base = "shared/db/" + s.slice(4);
  else if (s.startsWith("@config/")) base = "shared/config/" + s.slice(8);
  else if (s.startsWith("@api/")) base = "api/" + s.slice(5);
  else if (s.startsWith("./") || s.startsWith("../")) base = path.posix.normalize(path.posix.join(dir, s));
  else return null;

  for (const cand of [base + ".ts", base + "/index.ts"]) {
    if (fs.existsSync(path.join(SRC, cand))) return cand;
  }
  return null;
}

/** Extract every module specifier from a source file. */
function specifiers(code: string): string[] {
  const out: string[] = [];
  const push = (re: RegExp) => {
    for (const m of code.matchAll(re)) out.push(m[1]);
  };
  push(/(?:\bfrom\s+|\bimport\s*)["']([^"']+)["']/g);
  push(/\bimport\(\s*["']([^"']+)["']/g);
  push(/\bvi\.mock\(\s*["']([^"']+)["']/g);
  push(/\brequire\(\s*["']([^"']+)["']/g);
  return out;
}

const files = walkTs(SRC);

/** Adjacency: importer -> resolved targets. */
const graph = new Map<string, string[]>();
for (const file of files) {
  const from = rel(file);
  const code = fs.readFileSync(file, "utf8");
  const targets = new Set<string>();
  for (const spec of specifiers(code)) {
    const t = resolve(from, spec);
    if (t) targets.add(t);
  }
  graph.set(from, [...targets]);
}

describe("architecture: no file-level import cycles (R2)", () => {
  it("src/ import graph is a DAG", () => {
    const WHITE = 0, GREY = 1, BLACK = 2;
    const colour = new Map<string, number>();
    const stack: string[] = [];
    const cycles: string[] = [];

    const visit = (node: string): void => {
      colour.set(node, GREY);
      stack.push(node);
      for (const next of graph.get(node) ?? []) {
        const c = colour.get(next) ?? WHITE;
        if (c === GREY) {
          const at = stack.indexOf(next);
          cycles.push([...stack.slice(at), next].join("\n      -> "));
        } else if (c === WHITE) {
          visit(next);
        }
      }
      stack.pop();
      colour.set(node, BLACK);
    };

    for (const node of graph.keys()) {
      if ((colour.get(node) ?? WHITE) === WHITE) visit(node);
    }

    expect(cycles, `import cycle(s) detected:\n${cycles.join("\n\n")}`).toEqual([]);
  });
});

describe("architecture: guard integrity (the guards above must not be vacuous)", () => {
  it("resolves a meaningful import graph", () => {
    const edgeCount = [...graph.values()].reduce((n, t) => n + t.length, 0);
    expect(graph.size, "graph has no nodes — the walker found nothing").toBeGreaterThan(50);
    expect(edgeCount, "graph has almost no edges — resolve() is failing").toBeGreaterThan(100);
  });

  it("resolves the two edge shapes the guards depend on", () => {
    // an aliased edge and a relative edge, both real and stable
    expect(graph.get("app.ts") ?? []).toContain("modules/health/health.routes.ts");
    expect(graph.get("modules/work-orders/work-order.service.ts") ?? [])
      .toContain("modules/production/production-orders/production-order.repository.ts");
  });
});

describe("architecture: repositories are leaves (R1)", () => {
  const repos = files.filter((f) => f.endsWith(".repository.ts"));

  it("no repository imports a service", () => {
    const offenders: string[] = [];
    for (const repo of repos) {
      for (const target of graph.get(rel(repo)) ?? []) {
        if (target.endsWith(".service.ts")) {
          offenders.push(`${rel(repo)}  ->  ${target}`);
        }
      }
    }
    expect(offenders, `repository -> service imports found:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("cross-module repository imports are allow-listed", () => {
    const offenders: string[] = [];
    for (const repo of repos) {
      const from = rel(repo);
      const fromModule = from.split("/")[1];
      for (const target of graph.get(from) ?? []) {
        if (!target.endsWith(".repository.ts")) continue;
        if (target.split("/")[1] === fromModule) continue;
        const edge = `${from} -> ${target}`;
        if (!ALLOWED_CROSS_MODULE_REPO_EDGES.includes(edge)) offenders.push(edge);
      }
    }
    expect(
      offenders,
      `unexpected cross-module repository imports (add to the allow-list only if both are leaves):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
