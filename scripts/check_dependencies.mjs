#!/usr/bin/env node
import path from "node:path";
import { repositoryRoot, scriptPath } from "./check_dependencies_config.mjs";

export { analyzeWorkspace } from "./check_dependencies_analyze.mjs";
export {
  collectTargetPackages,
  collectWorkspacePackages,
} from "./check_dependencies_packages.mjs";

function formatFinding(finding) {
  const location = finding.file ? `${finding.file}: ` : "";
  return `[${finding.severity}] ${finding.package}: ${location}${finding.message}`;
}

function main() {
  const targets = process.argv.slice(2);
  const allPackages = collectWorkspacePackages(repositoryRoot);
  const selected =
    targets.length > 0
      ? collectTargetPackages(targets, allPackages)
      : allPackages;
  if (selected.some((pkg) => pkg === undefined)) {
    console.error("Some targets do not contain a package.json.");
    process.exitCode = 1;
    return;
  }

  const { findings } = analyzeWorkspace({
    root: repositoryRoot,
    packages: [
      ...allPackages,
      ...selected.filter((pkg) => !allPackages.includes(pkg)),
    ],
  });
  const directorySet = new Set(selected.map((pkg) => pkg.name));
  const selectedFindings = findings.filter((finding) =>
    directorySet.has(finding.package),
  );

  for (const pkg of selected) {
    const packageFindings = selectedFindings.filter(
      (finding) => finding.package === pkg.name,
    );
    const errors = packageFindings.filter(
      (finding) => finding.severity === "error",
    );
    const warnings = packageFindings.filter(
      (finding) => finding.severity === "warning",
    );
    if (packageFindings.length === 0) {
      console.log(`${pkg.relative}: all imports are declared and exported.`);
      continue;
    }
    for (const finding of [...errors, ...warnings]) {
      console.log(formatFinding(finding));
    }
    if (errors.length > 0) process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(scriptPath)) {
  main();
}
