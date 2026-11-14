import type { difference } from "./upgrade_safety.js";
import type {
  Check,
  PackageManager,
  Status,
  UpgradeReport,
  Verdict,
} from "./upgrade_types.js";

export function determineVerdict(
  checks: readonly Check[],
  baselineDiagnostics: Status,
  candidateDiagnostics: Status,
  urls: ReturnType<typeof difference>,
  output: ReturnType<typeof difference>,
): Verdict {
  if (checks[0]?.candidate === "FAIL") return "BLOCKED";
  if (checks.some((check) => check.baseline === "FAIL")) return "UNVERIFIED";
  if (
    checks.some((check) => check.candidate === "FAIL") ||
    candidateDiagnostics === "FAIL" ||
    urls.added.length ||
    urls.removed.length ||
    output.added.length ||
    output.removed.length
  )
    return "REVIEW REQUIRED";
  if (
    checks.some(
      (check) =>
        check.baseline === "UNVERIFIED" || check.candidate === "UNVERIFIED",
    ) ||
    baselineDiagnostics === "UNVERIFIED" ||
    candidateDiagnostics === "UNVERIFIED"
  )
    return "UNVERIFIED";
  return "READY";
}

export function report(
  target: string,
  packageManager: PackageManager | undefined,
  packages: readonly string[],
  checks: readonly Check[],
  urls: ReturnType<typeof difference>,
  output: ReturnType<typeof difference>,
  notes: readonly string[],
  verdict: Verdict,
  baselineDiagnostics: Status = "UNVERIFIED",
  candidateDiagnostics: Status = "UNVERIFIED",
): UpgradeReport {
  return {
    version: 1,
    verdict,
    target,
    packageManager,
    packages,
    checks,
    diagnostics: {
      baseline: baselineDiagnostics,
      candidate: candidateDiagnostics,
    },
    urls,
    output,
    notes,
  };
}

export function renderUpgradeReport(report: UpgradeReport): string {
  const side = (check: Check) =>
    `${check.name.padEnd(24)} ${check.baseline.padEnd(11)} ${check.candidate}`;
  return [
    "Riebeckite Upgrade Lab",
    `Target: ${report.target}`,
    `Package manager: ${report.packageManager ?? "unavailable"}`,
    `Packages: ${report.packages.join(", ") || "none"}`,
    "",
    "Check                    baseline    candidate",
    ...report.checks.map(side),
    `diagnostics              ${report.diagnostics.baseline.padEnd(11)} ${report.diagnostics.candidate}`,
    "",
    `URLs: +${report.urls.added.length} -${report.urls.removed.length}; output: +${report.output.added.length} -${report.output.removed.length}`,
    ...report.notes.map((note) => `- ${note}`),
    "",
    `Verdict: ${report.verdict}`,
  ].join("\n");
}
