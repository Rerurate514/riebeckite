import process from "node:process";
import { fileURLToPath } from "node:url";

const checks = [
  "pluginDx",
  "scaffold",
  "browser",
  "external",
  "fastPath",
  "fingerprint",
  "presetFastPath",
  "faultRecovery",
  "productionAssets",
];

const fullSelection = () =>
  Object.fromEntries(checks.map((check) => [check, true]));

const emptySelection = () =>
  Object.fromEntries(checks.map((check) => [check, false]));

const setChecks = (selection, names) => {
  for (const name of names) selection[name] = true;
  return selection;
};

const isDocumentationOnlyPath = (file) =>
  file.startsWith("docs/") || file === "README.md" || file === "README_ja.md";

const isBroadPath = (file) =>
  file.startsWith(".github/") ||
  file.startsWith("scripts/") ||
  file === "package.json" ||
  file === "pnpm-lock.yaml" ||
  file === "pnpm-workspace.yaml" ||
  file.startsWith("tsconfig") ||
  file === ".gitignore";

export function selectChecks(files) {
  if (!Array.isArray(files) || files.length === 0) return fullSelection();
  if (files.some(isBroadPath)) return fullSelection();

  const selection = emptySelection();
  for (const file of files) {
    if (isDocumentationOnlyPath(file) || file.startsWith("benchmarks/"))
      continue;
    if (file.startsWith("packages/core/") || file.startsWith("packages/cli/")) {
      setChecks(selection, [
        "browser",
        "external",
        "fastPath",
        "fingerprint",
        "presetFastPath",
        "faultRecovery",
      ]);
      continue;
    }
    if (file.startsWith("packages/integrations/")) {
      setChecks(selection, [
        "browser",
        "external",
        "fastPath",
        "fingerprint",
        "presetFastPath",
        "faultRecovery",
      ]);
      continue;
    }
    if (
      file.startsWith("packages/plugins/") ||
      file.startsWith("packages/themes/")
    ) {
      setChecks(selection, [
        "pluginDx",
        "external",
        "fastPath",
        "presetFastPath",
      ]);
      continue;
    }
    if (file.startsWith("packages/create-riebeckite/")) {
      setChecks(selection, [
        "scaffold",
        "external",
        "fastPath",
        "presetFastPath",
      ]);
      continue;
    }
    if (file.startsWith("apps/web/")) {
      setChecks(selection, ["browser", "productionAssets"]);
      continue;
    }
    if (file.startsWith("tests/external-site/")) {
      setChecks(selection, [
        "external",
        "fastPath",
        "fingerprint",
        "presetFastPath",
        "faultRecovery",
      ]);
      continue;
    }
    if (file.startsWith("tests/plugin-dx/")) {
      setChecks(selection, ["pluginDx"]);
      continue;
    }
    if (
      file.startsWith("templates/") ||
      file.startsWith("packages/test/") ||
      file.startsWith("tests/")
    ) {
      return fullSelection();
    }
    return fullSelection();
  }
  return selection;
}

function parseFiles(args) {
  const filesIndex = args.indexOf("--files");
  if (filesIndex < 0 || !args[filesIndex + 1]) return null;
  return args[filesIndex + 1].split(",").filter(Boolean);
}

function emit(selection) {
  for (const [name, enabled] of Object.entries(selection)) {
    process.stdout.write(`${name}=${enabled}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  emit(selectChecks(parseFiles(process.argv.slice(2))));
}
