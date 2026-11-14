import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RiebeckiteProject } from "../application_root.js";
import {
  detectPackageManager,
  readManifest,
  riebeckitePackages,
  updateRiebeckiteVersions,
} from "./upgrade_install.js";
import {
  determineVerdict,
  renderUpgradeReport,
  report,
} from "./upgrade_report.js";
import {
  assertSafeProjectTree,
  copyProject,
  difference,
  emptyDifference,
} from "./upgrade_safety.js";
import type { Check, UpgradeReport } from "./upgrade_types.js";
import { verifySite } from "./upgrade_verify.js";

export async function runUpgradeCheck(
  project: RiebeckiteProject,
  options: { readonly to: string; readonly json: boolean },
): Promise<boolean> {
  const report = await collectUpgradeReport(project, options.to);
  console.log(
    options.json ? JSON.stringify(report) : renderUpgradeReport(report),
  );
  return report.verdict === "READY" && process.exitCode !== 130;
}

export async function collectUpgradeReport(
  project: RiebeckiteProject,
  target: string,
): Promise<UpgradeReport> {
  const manifest = await readManifest(
    path.join(project.projectRoot, "package.json"),
  );
  const packages = riebeckitePackages(manifest);
  const manager = await detectPackageManager(project.projectRoot);
  const notes: string[] = [];
  if (!manager) {
    return report(
      target,
      undefined,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat(
        "A package-lock.json or pnpm-lock.yaml is required to create a reproducible isolated check.",
      ),
      "BLOCKED",
    );
  }
  if (packages.length === 0) {
    return report(
      target,
      manager,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat("No @riebeckite/* dependency is declared in package.json."),
      "BLOCKED",
    );
  }
  if (
    path.relative(project.projectRoot, project.contentRoot).startsWith("..")
  ) {
    return report(
      target,
      manager,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat(
        "The content root is outside the project and cannot be snapshotted safely.",
      ),
      "UNVERIFIED",
    );
  }

  const temporary = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-upgrade-"),
  );
  const controller = new AbortController();
  const interrupt = () => {
    process.exitCode = 130;
    controller.abort();
  };
  process.once("SIGINT", interrupt);
  try {
    await assertSafeProjectTree(project.projectRoot);
    const baselineRoot = path.join(temporary, "baseline");
    const candidateRoot = path.join(temporary, "candidate");
    await copyProject(project.projectRoot, baselineRoot);
    await copyProject(project.projectRoot, candidateRoot);
    await updateRiebeckiteVersions(
      path.join(candidateRoot, "package.json"),
      target,
    );

    const baseline = await verifySite(
      baselineRoot,
      manager,
      manifest,
      packages,
      undefined,
      controller.signal,
    );
    if (controller.signal.aborted)
      throw new Error("Upgrade check interrupted.");
    const candidate = await verifySite(
      candidateRoot,
      manager,
      manifest,
      packages,
      target,
      controller.signal,
    );
    if (controller.signal.aborted)
      throw new Error("Upgrade check interrupted.");
    const checks: Check[] = [
      {
        name: "dependency / peer / engines",
        baseline: baseline.install,
        candidate: candidate.install,
      },
      {
        name: "typecheck",
        baseline: baseline.typecheck,
        candidate: candidate.typecheck,
      },
      {
        name: "Riebeckite check",
        baseline: baseline.check,
        candidate: candidate.check,
      },
      {
        name: "production build",
        baseline: baseline.build,
        candidate: candidate.build,
      },
    ];
    const urls = difference(baseline.urls, candidate.urls);
    const output = difference(baseline.files, candidate.files);
    if (
      baseline.diagnostics === "UNVERIFIED" ||
      candidate.diagnostics === "UNVERIFIED"
    )
      notes.push(
        "Diagnostics could not be collected for at least one environment.",
      );
    if (urls.added.length || urls.removed.length)
      notes.push("Generated URL changes need publication review.");
    if (output.added.length || output.removed.length)
      notes.push("Generated output or asset changes need review.");
    notes.push(...baseline.notes, ...candidate.notes);
    const verdict = determineVerdict(
      checks,
      baseline.diagnostics,
      candidate.diagnostics,
      urls,
      output,
    );
    return report(
      target,
      manager,
      packages,
      checks,
      urls,
      output,
      notes,
      verdict,
      baseline.diagnostics,
      candidate.diagnostics,
    );
  } catch (error) {
    return report(
      target,
      manager,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat(
        error instanceof Error
          ? error.message
          : "The isolated upgrade check could not start.",
      ),
      "BLOCKED",
    );
  } finally {
    process.removeListener("SIGINT", interrupt);
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
