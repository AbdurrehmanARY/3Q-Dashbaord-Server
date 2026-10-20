import app from "./src/app";

const rows: string[] = [];
const walk = (stack: any[], prefix: string = ""): void => {
  for (const l of stack) {
    if (l.route) {
      const p = prefix + (l.route.path === "/" ? "" : l.route.path);
      for (const m of Object.keys(l.route.methods)) rows.push(m.toUpperCase() + " " + p);
    } else if (l.name === "router" && l.handle && l.handle.stack) {
      const seg = l.regexp && l.regexp.source
        ? l.regexp.source
            .replace("^\\/", "/")
            .replace("\\/?(?=\\/|$)", "")
            .replace(/\\\//g, "/")
            .replace(/\$$/, "")
        : "";
      walk(l.handle.stack, prefix + (seg || ""));
    }
  }
};
walk((app as any)._router.stack);
console.log(JSON.stringify(rows.sort(), null, 2));
