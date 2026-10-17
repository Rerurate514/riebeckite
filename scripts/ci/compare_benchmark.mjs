import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [currentPath, baselinePath] = process.argv.slice(2);
if (!currentPath || !baselinePath) {
  throw new Error(
    "Usage: node scripts/ci/compare_benchmark.mjs <current.json> <baseline.json>",
  );
}

const current = JSON.parse(fs.readFileSync(path.resolve(currentPath), "utf8"));
const baseline = JSON.parse(
  fs.readFileSync(path.resolve(baselinePath), "utf8"),
);
const keyFor = (row) => `${row.preset}/${row.size}/${row.scenario}`;
const baselineRows = new Map(baseline.rows.map((row) => [keyFor(row), row]));
const lines = current.rows.flatMap((row) => {
  const previous = baselineRows.get(keyFor(row));
  if (!previous || typeof previous.wallTimeMs !== "number") return [];
  const delta = row.wallTimeMs - previous.wallTimeMs;
  const percent = (delta / previous.wallTimeMs) * 100;
  return [
    `${keyFor(row)}: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}ms (${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%)`,
  ];
});
process.stdout.write(
  `${lines.length > 0 ? lines.join("\n") : "No matching baseline rows."}\n`,
);
