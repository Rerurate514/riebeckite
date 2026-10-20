import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createLogger,
  type PackageSpec,
  packPackages,
  run,
  walkFiles,
  writeFileDependencies,
} from "@riebeckite/test/e2e";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const logger = createLogger("preset-fast-path");
const keep = process.env.RIEBECKITE_PRESET_FAST_PATH_KEEP === "1";
const presetFilter = (process.env.RIEBECKITE_PRESET_FAST_PATH_PRESETS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const ALL_PRESETS = ["empty", "minimal", "starter", "showcase"] as const;
type PresetName = (typeof ALL_PRESETS)[number];

const presets: readonly PresetName[] =
  presetFilter.length > 0
    ? (presetFilter as readonly PresetName[])
    : ALL_PRESETS;

const FAST_PATH_EXPECTATIONS: Readonly<
  Record<PresetName, { capable: boolean; blockReason?: string }>
> = {
  empty: { capable: true },
  minimal: { capable: true },
  starter: { capable: false, blockReason: "plugin-generated-output-plan" },
  showcase: { capable: false, blockReason: "plugin-build-end" },
};

const RENDERS_ENTRY_TITLE: Readonly<Record<PresetName, boolean>> = {
  empty: false,
  minimal: false,
  starter: true,
  showcase: true,
};

const MATRIX_NOTE = "notes/f5-matrix.md";
const MATRIX_NOTE_MOVED = "guides/f5-matrix.md";
const MATRIX_TITLE = "F5 Matrix Note";
const MATRIX_TITLE_RENAMED = "F5 Matrix Note Renamed";
const MATRIX_BODY_V1 = "F5_MATRIX_BODY_V1";
const MATRIX_BODY_V2 = "F5_MATRIX_BODY_V2";
const MATRIX_SCHEDULED_NOTE = "notes/f5-scheduled.md";
const MATRIX_SCHEDULED_TITLE = "F5 Scheduled Note";
const MATRIX_SCHEDULED_BODY = "F5_SCHEDULED_BODY_V1";

interface DistDifference {
  readonly onlyBefore: readonly string[];
  readonly onlyAfter: readonly string[];
  readonly changed: readonly string[];
}

interface AssertionResult {
  readonly name: string;
  readonly ok: boolean;
  readonly detail?: string;
}

async function discoverPackages(): Promise<PackageSpec[]> {
  const scanRoots = [
    "packages",
    "packages/integrations",
    "packages/plugins",
    "packages/themes",
  ];
  const specs: PackageSpec[] = [];
  for (const scanRoot of scanRoots) {
    const entries = await fsp
      .readdir(path.join(repoRoot, scanRoot), { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifest = await fsp
        .readFile(
          path.join(repoRoot, scanRoot, entry.name, "package.json"),
          "utf8",
        )
        .then(
          (source) =>
            JSON.parse(source) as { name?: string; private?: boolean },
        )
        .catch(() => undefined);
      if (!manifest?.name || manifest.private === true) continue;
      specs.push({
        directory: `${scanRoot}/${entry.name}`,
        name: manifest.name,
      });
    }
  }
  return specs;
}

function snapshotDirectory(directory: string): Map<string, string> {
  const snapshot = new Map<string, string>();
  for (const file of walkFiles(directory)) {
    const relative = path.relative(directory, file).split(path.sep).join("/");
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex");
    snapshot.set(relative, hash);
  }
  return snapshot;
}

function diffSnapshots(
  before: Map<string, string>,
  after: Map<string, string>,
): DistDifference {
  const onlyBefore: string[] = [];
  const onlyAfter: string[] = [];
  const changed: string[] = [];
  for (const [file, hash] of before) {
    if (!after.has(file)) onlyBefore.push(file);
    else if (after.get(file) !== hash) changed.push(file);
  }
  for (const file of after.keys()) {
    if (!before.has(file)) onlyAfter.push(file);
  }
  return {
    onlyBefore: onlyBefore.sort(),
    onlyAfter: onlyAfter.sort(),
    changed: changed.sort(),
  };
}

function differenceIsEmpty(difference: DistDifference): boolean {
  return (
    difference.onlyBefore.length === 0 &&
    difference.onlyAfter.length === 0 &&
    difference.changed.length === 0
  );
}

function describeDifference(difference: DistDifference): string {
  const sample = (values: readonly string[]): string =>
    values.slice(0, 4).join(", ") + (values.length > 4 ? ", …" : "");
  return (
    `onlyBefore=${difference.onlyBefore.length}[${sample(difference.onlyBefore)}] ` +
    `onlyAfter=${difference.onlyAfter.length}[${sample(difference.onlyAfter)}] ` +
    `changed=${difference.changed.length}[${sample(difference.changed)}]`
  );
}

function filesContaining(directory: string, marker: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const matches: string[] = [];
  for (const file of walkFiles(directory)) {
    let content: Buffer;
    try {
      content = fs.readFileSync(file);
    } catch {
      continue;
    }
    if (content.includes(marker)) {
      matches.push(path.relative(directory, file).split(path.sep).join("/"));
    }
  }
  return matches.sort();
}

function presetNote(options: {
  readonly title: string;
  readonly visibility?: "draft" | "unlisted";
  readonly publishAt?: string;
  readonly body: string;
}): string {
  const frontmatter = ["---", `title: ${options.title}`, "publish: true"];
  if (options.publishAt) frontmatter.push(`publishAt: "${options.publishAt}"`);
  if (options.visibility) frontmatter.push(`visibility: ${options.visibility}`);
  frontmatter.push("---", "");
  return `${frontmatter.join("\n")}\n${options.body}\n`;
}

interface FastPathParse {
  readonly used?: boolean;
  readonly eligible?: boolean;
  readonly blockReason?: string;
  readonly outputFilesHashed?: number;
}

function parseFastPath(output: string): FastPathParse {
  const used = /^ {2}Used {2,}(yes|no)\s*$/m.exec(output)?.[1];
  const eligible = /^ {2}Eligible {2,}(yes|no)\s*$/m.exec(output)?.[1];
  const blockReason = /^ {2}Block reason {2,}(\S+)\s*$/m.exec(output)?.[1];
  const outputFilesHashed = /^ {2}Output files hashed {2,}(\d+)\s*$/m.exec(
    output,
  )?.[1];
  return {
    used: used === "yes" ? true : used === "no" ? false : undefined,
    eligible: eligible === "yes" ? true : eligible === "no" ? false : undefined,
    blockReason,
    outputFilesHashed:
      outputFilesHashed === undefined ? undefined : Number(outputFilesHashed),
  };
}

interface ContentParse {
  readonly total: number;
  readonly processed: number;
  readonly reused: number;
}

function parseContent(output: string): ContentParse | undefined {
  const match = /Content: (\d+) total · (\d+) processed · (\d+) reused/.exec(
    output,
  );
  if (!match) return undefined;
  return {
    total: Number(match[1]),
    processed: Number(match[2]),
    reused: Number(match[3]),
  };
}

interface SsgParse {
  readonly rendered: number;
  readonly reused: number;
  readonly removed: number;
}

function parseSsg(output: string): SsgParse | undefined {
  const match =
    /SSG outputs: (\d+) rendered · (\d+) reused · (\d+) removed/.exec(output);
  if (!match) return undefined;
  return {
    rendered: Number(match[1]),
    reused: Number(match[2]),
    removed: Number(match[3]),
  };
}

interface SsgMetrics {
  readonly processedContentCount?: number;
  readonly reusedContentCount?: number;
  readonly renderedOutputCount?: number;
  readonly reusedOutputCount?: number;
  readonly removedOutputCount?: number;
  readonly manifestHookCacheHit?: number;
  readonly manifestHookCacheMiss?: number;
  readonly manifestHooksExecuted?: number;
  readonly manifestHooksReused?: number;
  readonly fullRegenerationRequired?: boolean;
  readonly missingInPlanCount?: number;
  readonly missingInDistCount?: number;
  readonly unknownOutputCount?: number;
  readonly ownerConflictCount?: number;
  readonly publicationViolationCount?: number;
  readonly plannedGenerateOutputCount?: number;
  readonly plannedReuseOutputCount?: number;
  readonly plannedRemoveOutputCount?: number;
  readonly plannedUnknownOutputCount?: number;
}

function readSsgMetrics(file: string): SsgMetrics | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as SsgMetrics;
  } catch {
    return undefined;
  }
}

interface BuildRecord {
  readonly preset: string;
  readonly case: string;
  readonly command: string;
  readonly fastPathUsed?: boolean;
  readonly fastPathEligible?: boolean;
  readonly blockReason?: string;
  readonly outputFilesHashed?: number;
  readonly contentTotal?: number;
  readonly contentProcessed?: number;
  readonly contentReused?: number;
  readonly ssgRendered?: number;
  readonly ssgReused?: number;
  readonly ssgRemoved?: number;
  readonly ssgSkipped?: boolean;
  readonly viteStartupSkipped?: boolean;
  readonly manifestHookCacheHit?: number;
  readonly manifestHookCacheMiss?: number;
  readonly metrics?: SsgMetrics;
}

interface PresetResult {
  readonly preset: string;
  readonly siteDir?: string;
  readonly installed?: boolean;
  readonly error?: string;
  readonly builds: BuildRecord[];
  readonly checks: AssertionResult[];
  readonly ok?: boolean;
  readonly incrementalVsFullEqual?: boolean;
  readonly incrementalVsFullDifference?: DistDifference;
}

interface BuildOptions {
  readonly full?: boolean;
  readonly metricsFile?: string;
}

class PresetSite {
  private caseIndex = 0;

  constructor(
    readonly preset: string,
    readonly siteDir: string,
    private readonly installedCli: string,
    private readonly metricsDir: string,
    private readonly resultsDir: string,
    private readonly builds: BuildRecord[],
  ) {}

  get contentDir(): string {
    return path.join(this.siteDir, "content");
  }

  get configPath(): string {
    return path.join(this.siteDir, "riebeckite.config.ts");
  }

  get distDir(): string {
    return path.join(this.siteDir, "dist");
  }

  writeNote(relative: string, source: string): void {
    const target = path.join(this.contentDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }

  removeNote(relative: string): void {
    fs.rmSync(path.join(this.contentDir, relative), { force: true });
  }

  build(
    name: string,
    options: BuildOptions = {},
  ): { record: BuildRecord; output: string } {
    this.caseIndex += 1;
    const slug = `${String(this.caseIndex).padStart(2, "0")}-${slugify(name)}`;
    const metricsPath =
      options.metricsFile ?? path.join(this.metricsDir, `${slug}.json`);
    fs.rmSync(metricsPath, { force: true });
    const args = ["profile"];
    if (options.full) args.push("--full");
    logger.step(`[${this.preset}] ${name}: riebeckite ${args.join(" ")}`);
    const result = run(process.execPath, [this.installedCli, ...args], {
      cwd: this.siteDir,
      env: {
        RIEBECKITE_BUILD_CONCURRENCY: "1",
        RIEBECKITE_SSG_METRICS_FILE: metricsPath,
      },
    });
    const output = `${result.stdout}${result.stderr}`;
    fs.writeFileSync(path.join(this.resultsDir, `${slug}.log`), output);
    const fastPath = parseFastPath(output);
    const content = parseContent(output);
    const ssg = parseSsg(output);
    const metrics = readSsgMetrics(metricsPath);
    const record: BuildRecord = {
      preset: this.preset,
      case: name,
      command: args.join(" "),
      fastPathUsed: fastPath.used,
      fastPathEligible: fastPath.eligible,
      blockReason: fastPath.blockReason,
      outputFilesHashed: fastPath.outputFilesHashed,
      contentTotal: content?.total,
      contentProcessed: content?.processed,
      contentReused: content?.reused,
      ssgRendered: ssg?.rendered,
      ssgReused: ssg?.reused,
      ssgRemoved: ssg?.removed,
      ssgSkipped: metrics === undefined,
      viteStartupSkipped: /No-change fast path: Vite and SSG skipped\./.test(
        output,
      ),
      manifestHookCacheHit: metrics?.manifestHookCacheHit,
      manifestHookCacheMiss: metrics?.manifestHookCacheMiss,
      metrics,
    };
    this.builds.push(record);
    logger.step(
      `  fastPath=${record.fastPathUsed ?? "?"} block=${record.blockReason ?? "(none)"} content=${record.contentProcessed ?? "-"}/${record.contentReused ?? "-"} ssg=${record.ssgRendered ?? "-"}/${record.ssgReused ?? "-"} hookHit=${record.manifestHookCacheHit ?? "-"} hookMiss=${record.manifestHookCacheMiss ?? "-"} filesHashed=${record.outputFilesHashed ?? "-"}`,
    );
    return { record, output };
  }

  snapshot(): Map<string, string> {
    return snapshotDirectory(this.distDir);
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function runPreset(
  preset: PresetName,
  workspaceRoot: string,
  resultsDir: string,
  packed: Awaited<ReturnType<typeof packPackages>>,
): Promise<PresetResult> {
  const siteDir = path.join(workspaceRoot, preset);
  const metricsDir = path.join(workspaceRoot, `${preset}-metrics`);
  const builds: BuildRecord[] = [];
  const checks: AssertionResult[] = [];
  const check = (name: string, ok: boolean, detail?: string): void => {
    checks.push({ name, ok, detail });
    logger.step(
      `  ${ok ? "PASS" : "FAIL"} ${name}${detail === undefined ? "" : ` — ${detail}`}`,
    );
  };
  await fsp.mkdir(metricsDir, { recursive: true });
  try {
    const repoCli = path.join(
      repoRoot,
      "packages",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    logger.step(`[${preset}] scaffolding (riebeckite init --preset ${preset})`);
    const scaffold = run(
      process.execPath,
      [repoCli, "init", siteDir, "--preset", preset],
      { cwd: repoRoot, env: { RIEBECKITE_BUILD_CONCURRENCY: "1" } },
    );
    if (scaffold.status !== 0) {
      return {
        preset,
        siteDir,
        installed: false,
        error: `scaffold failed: ${scaffold.stdout}${scaffold.stderr}`,
        builds,
        checks,
        ok: false,
      };
    }

    writeFileDependencies(siteDir, packed);

    logger.step(`[${preset}] npm install`);
    const install = run(
      "npm",
      ["install", "--no-audit", "--no-fund", "--loglevel=error"],
      { cwd: siteDir, env: { RIEBECKITE_BUILD_CONCURRENCY: "1" } },
    );
    if (install.status !== 0) {
      return {
        preset,
        siteDir,
        installed: false,
        error: `npm install failed: ${install.stdout}${install.stderr}`,
        builds,
        checks,
        ok: false,
      };
    }

    const installedCli = path.join(
      siteDir,
      "node_modules",
      "@riebeckite",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    if (!fs.existsSync(installedCli)) {
      return {
        preset,
        siteDir,
        installed: false,
        error: `installed CLI is missing: ${installedCli}`,
        builds,
        checks,
        ok: false,
      };
    }

    const site = new PresetSite(
      preset,
      siteDir,
      installedCli,
      metricsDir,
      resultsDir,
      builds,
    );
    const { capable, blockReason: expectedBlockReason } =
      FAST_PATH_EXPECTATIONS[preset];
    const routesContent = preset !== "empty";

    const cold = site.build("Cold Build");
    const coldSnapshot = site.snapshot();
    check(
      "cold build produces dist",
      coldSnapshot.size > 0,
      `files=${coldSnapshot.size}`,
    );
    if (coldSnapshot.size === 0) {
      return {
        preset,
        siteDir,
        installed: true,
        error: "cold build produced no dist",
        builds,
        checks,
        ok: false,
      };
    }
    check(
      "cold build does not use the fast path",
      cold.record.fastPathUsed === false,
      `block=${cold.record.blockReason ?? "(none)"}`,
    );
    checkOutputPlanCoverage(check, "cold build", cold.record.metrics);

    const noChange = site.build("No-change");
    if (noChange.record.metrics)
      checkOutputPlanCoverage(
        check,
        "no-change build",
        noChange.record.metrics,
      );
    if (capable) {
      check(
        "no-change uses the fast path",
        noChange.record.fastPathUsed === true,
        `block=${noChange.record.blockReason ?? "(none)"}`,
      );
      check(
        "no-change fast path reports no block reason",
        noChange.record.blockReason === undefined,
      );
      check(
        "no-change fast path skips Vite and SSG",
        noChange.record.viteStartupSkipped === true &&
          noChange.record.ssgSkipped === true,
      );
      check(
        "no-change fast path hashes the output inventory",
        (noChange.record.outputFilesHashed ?? 0) > 0,
        `filesHashed=${noChange.record.outputFilesHashed ?? "-"}`,
      );
      const stableDifference = diffSnapshots(coldSnapshot, site.snapshot());
      check(
        "no-change output is byte-identical to cold",
        differenceIsEmpty(stableDifference),
        describeDifference(stableDifference).slice(0, 200),
      );
    } else {
      check(
        "no-change falls back to the normal build",
        noChange.record.fastPathUsed === false,
      );
      check(
        "no-change fallback reports a block reason",
        typeof noChange.record.blockReason === "string" &&
          noChange.record.blockReason.length > 0,
        `block=${noChange.record.blockReason ?? "(none)"}`,
      );
      if (expectedBlockReason) {
        check(
          "no-change fallback reports the expected block reason",
          noChange.record.blockReason === expectedBlockReason,
          `block=${noChange.record.blockReason ?? "(none)"}`,
        );
      }
    }

    if (routesContent) {
      site.writeNote(
        MATRIX_NOTE,
        presetNote({ title: MATRIX_TITLE, body: MATRIX_BODY_V1 }),
      );
      site.build("Add note");
      check(
        "added note is published",
        filesContaining(site.distDir, MATRIX_BODY_V1).length > 0,
      );

      site.writeNote(
        MATRIX_NOTE,
        presetNote({ title: MATRIX_TITLE, body: MATRIX_BODY_V2 }),
      );
      site.build("Edit note body");
      check(
        "edited body is published",
        filesContaining(site.distDir, MATRIX_BODY_V2).length > 0,
      );
      check(
        "stale body is removed from output",
        filesContaining(site.distDir, MATRIX_BODY_V1).length === 0,
      );

      site.writeNote(
        MATRIX_NOTE,
        presetNote({ title: MATRIX_TITLE_RENAMED, body: MATRIX_BODY_V2 }),
      );
      site.build("Edit note title");
      if (RENDERS_ENTRY_TITLE[preset]) {
        check(
          "edited frontmatter title is published",
          filesContaining(site.distDir, MATRIX_TITLE_RENAMED).length > 0,
        );
      } else {
        check(
          "title-only edit still renders the note",
          filesContaining(site.distDir, MATRIX_BODY_V2).length > 0,
        );
      }

      site.writeNote(
        MATRIX_NOTE_MOVED,
        presetNote({ title: MATRIX_TITLE_RENAMED, body: MATRIX_BODY_V2 }),
      );
      site.removeNote(MATRIX_NOTE);
      site.build("Move note");
      check(
        "moved note is published",
        filesContaining(site.distDir, MATRIX_BODY_V2).length > 0,
      );
      if (preset === "minimal" || preset === "starter") {
        check(
          "moved note removes the old output",
          !fs.existsSync(path.join(site.distDir, "notes/f5-matrix.html")) &&
            !fs.existsSync(
              path.join(site.distDir, "notes/f5-matrix/index.html"),
            ),
        );
      }

      site.writeNote(
        MATRIX_NOTE_MOVED,
        presetNote({
          title: MATRIX_TITLE_RENAMED,
          visibility: "draft",
          body: MATRIX_BODY_V2,
        }),
      );
      site.build("Note to draft");
      check(
        "draft note body is not published",
        filesContaining(site.distDir, MATRIX_BODY_V2).length === 0,
      );
      check(
        "draft note title is not published",
        filesContaining(site.distDir, MATRIX_TITLE_RENAMED).length === 0,
      );

      site.writeNote(
        MATRIX_NOTE_MOVED,
        presetNote({ title: MATRIX_TITLE_RENAMED, body: MATRIX_BODY_V2 }),
      );
      site.build("Note to public");
      check(
        "republished note is published",
        filesContaining(site.distDir, MATRIX_BODY_V2).length > 0,
      );

      site.writeNote(
        MATRIX_NOTE_MOVED,
        presetNote({
          title: MATRIX_TITLE_RENAMED,
          visibility: "unlisted",
          body: MATRIX_BODY_V2,
        }),
      );
      site.build("Note to unlisted");
      check(
        "unlisted note stays routable",
        filesContaining(site.distDir, MATRIX_BODY_V2).length > 0,
      );
      const sitemap = path.join(site.distDir, "sitemap.xml");
      if (fs.existsSync(sitemap)) {
        check(
          "unlisted note is excluded from the sitemap",
          !fs.readFileSync(sitemap, "utf8").includes("f5-matrix"),
        );
      }

      site.removeNote(MATRIX_NOTE_MOVED);
      site.build("Delete note");
      check(
        "deleted note is removed from output",
        filesContaining(site.distDir, MATRIX_BODY_V2).length === 0,
      );

      site.writeNote(
        MATRIX_SCHEDULED_NOTE,
        presetNote({
          title: MATRIX_SCHEDULED_TITLE,
          publishAt: "2099-01-01T00:00:00Z",
          body: MATRIX_SCHEDULED_BODY,
        }),
      );
      site.build("Scheduled note");
      check(
        "scheduled note body is not published",
        filesContaining(site.distDir, MATRIX_SCHEDULED_BODY).length === 0,
      );
      check(
        "scheduled note title is not published",
        filesContaining(site.distDir, MATRIX_SCHEDULED_TITLE).length === 0,
      );
      site.removeNote(MATRIX_SCHEDULED_NOTE);
      site.build("Remove scheduled note");
    }

    if (capable) {
      const extraPath = path.join(site.distDir, "__f5_matrix_extra__.txt");
      fs.writeFileSync(extraPath, "unexpected\n");
      const tampered = site.build("Tampered output");
      check(
        "tampered output blocks the fast path",
        tampered.record.blockReason === "output-inventory-mismatch",
        `block=${tampered.record.blockReason ?? "(none)"}`,
      );
      check("tampered output is healed", !fs.existsSync(extraPath));
    }

    if (preset === "starter" || preset === "showcase") {
      const configPath = path.join(siteDir, "riebeckite.config.ts");
      const original = fs.readFileSync(configPath, "utf8");
      fs.writeFileSync(
        configPath,
        original.replace("relatedPosts({ limit: 5", "relatedPosts({ limit: 4"),
      );
      const changed = site.build("Plugin option change");
      check(
        "plugin option change rebuilds without the fast path",
        changed.record.fastPathUsed === false,
        `block=${changed.record.blockReason ?? "(none)"}`,
      );
      const changedSnapshot = site.snapshot();
      const settled = site.build("Plugin option no-change");
      check(
        "plugin option no-change restores the fast path",
        settled.record.fastPathUsed === capable,
        `block=${settled.record.blockReason ?? "(none)"}`,
      );
      const settledDifference = diffSnapshots(changedSnapshot, site.snapshot());
      check(
        "plugin option change output is stable",
        differenceIsEmpty(settledDifference),
        describeDifference(settledDifference).slice(0, 200),
      );
    }

    const incrementalSnapshot = site.snapshot();
    const full = site.build("Full Build", { full: true });
    const fullSnapshot = site.snapshot();
    check(
      "full build reports full-build-requested",
      full.record.blockReason === "full-build-requested",
      `block=${full.record.blockReason ?? "(none)"}`,
    );
    const difference = diffSnapshots(incrementalSnapshot, fullSnapshot);
    check(
      "incremental and full outputs are byte-identical",
      differenceIsEmpty(difference),
      describeDifference(difference).slice(0, 200),
    );

    const recovery = site.build("No-change recovery");
    if (capable) {
      check(
        "no-change fast path recovers after the full build",
        recovery.record.fastPathUsed === true,
        `block=${recovery.record.blockReason ?? "(none)"}`,
      );
    } else {
      check(
        "fallback stays stable after the full build",
        recovery.record.fastPathUsed === false,
        `block=${recovery.record.blockReason ?? "(none)"}`,
      );
    }

    const ok = checks.every((entry) => entry.ok);
    return {
      preset,
      siteDir,
      installed: true,
      builds,
      checks,
      ok,
      incrementalVsFullEqual: differenceIsEmpty(difference),
      incrementalVsFullDifference: difference,
    };
  } catch (error) {
    return {
      preset,
      siteDir,
      installed: true,
      error: error instanceof Error ? error.message : String(error),
      builds,
      checks,
      ok: false,
    };
  }
}

function checkOutputPlanCoverage(
  check: (name: string, ok: boolean, detail?: string) => void,
  label: string,
  metrics: SsgMetrics | undefined,
): void {
  check(`${label} records Output Plan metrics`, metrics !== undefined);
  if (!metrics) return;
  check(
    `${label} has no missing planned output`,
    metrics.missingInPlanCount === 0,
    `missing=${metrics.missingInPlanCount ?? "-"}`,
  );
  check(
    `${label} has no missing dist output`,
    metrics.missingInDistCount === 0,
    `missing=${metrics.missingInDistCount ?? "-"}`,
  );
  check(
    `${label} has no unknown output`,
    metrics.unknownOutputCount === 0,
    `unknown=${metrics.unknownOutputCount ?? "-"}`,
  );
  check(
    `${label} has no owner conflict`,
    metrics.ownerConflictCount === 0,
    `conflicts=${metrics.ownerConflictCount ?? "-"}`,
  );
  check(
    `${label} has no publication violation`,
    metrics.publicationViolationCount === 0,
    `violations=${metrics.publicationViolationCount ?? "-"}`,
  );
}

function printAudit(results: readonly PresetResult[]): void {
  console.log("\nPreset fast path audit");
  console.log(
    "preset | case | fastPath | block | content processed/reused | ssg rendered/reused | hookHit/Miss | filesHashed",
  );
  for (const result of results) {
    if (result.error) {
      console.log(`${result.preset} | ERROR | ${result.error}`);
      continue;
    }
    for (const record of result.builds) {
      console.log(
        [
          result.preset,
          record.case,
          record.fastPathUsed ? "yes" : "no",
          record.blockReason ?? "-",
          `${record.contentProcessed ?? "-"}/${record.contentReused ?? "-"}`,
          `${record.ssgRendered ?? "-"}/${record.ssgReused ?? "-"}`,
          `${record.manifestHookCacheHit ?? "-"}/${record.manifestHookCacheMiss ?? "-"}`,
          record.outputFilesHashed ?? "-",
        ].join(" | "),
      );
    }
  }
}

function printChecks(results: readonly PresetResult[]): number {
  console.log("\nPreset fast path checks");
  let failures = 0;
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status} ${result.preset}`);
    for (const entry of result.checks) {
      if (entry.ok) continue;
      failures += 1;
      console.log(
        `  - ${entry.name}${entry.detail === undefined ? "" : ` — ${entry.detail}`}`,
      );
    }
    if (result.error) {
      failures += 1;
      console.log(`  - error: ${result.error}`);
    }
  }
  return failures;
}

async function main(): Promise<void> {
  const workspaceRoot = await fsp.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-fast-path-"),
  );
  const tarballDir = path.join(workspaceRoot, "tarballs");
  const resultsDir = path.join(
    os.tmpdir(),
    "riebeckite-preset-fast-path-results",
  );
  logger.step(`workspace ${workspaceRoot}`);
  await fsp.mkdir(tarballDir, { recursive: true });
  await fsp.mkdir(resultsDir, { recursive: true });

  const results: PresetResult[] = [];
  try {
    const packages = await discoverPackages();
    logger.step(`packing ${packages.length} packages`);
    const packed = await packPackages(tarballDir, {
      repoRoot,
      packages,
      concurrency: 1,
      logger,
    });

    for (const preset of presets) {
      logger.step(`===== preset ${preset} =====`);
      results.push(await runPreset(preset, workspaceRoot, resultsDir, packed));
    }

    const outputFile = path.join(resultsDir, "preset-matrix.json");
    await fsp.writeFile(
      outputFile,
      `${JSON.stringify({ workspaceRoot, results }, null, 2)}\n`,
    );
    logger.step(`results written to ${outputFile}`);

    printAudit(results);
    const failures = printChecks(results);
    if (failures > 0) {
      assert.fail(`${failures} preset fast path check(s) failed`);
    }
  } finally {
    if (keep) {
      logger.step(`kept workspace ${workspaceRoot}`);
    } else {
      await fsp.rm(workspaceRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
