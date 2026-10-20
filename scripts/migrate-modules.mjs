const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const ALL = argv.includes("--all");
const requested = argv.filter((a) => !a.startsWith("--"));
