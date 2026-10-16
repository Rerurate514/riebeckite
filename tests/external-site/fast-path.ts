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
const logger = createLogger("fast-path");
const keep = process.env.RIEBECKITE_FAST_PATH_KEEP === "1";

const BODY_MARKER = "FASTPATH_BODY_MARKER_V1";
const TITLE_V2 = "FASTPATH_TITLE_V2";
const TEMP_NOTE_MARKER = "FASTPATH_TEMP_NOTE_MARKER";
const MOVE_MARKER = "FASTPATH_MOVE_MARKER";
const FOLDER_INDEX_MARKER = "FASTPATH_FOLDER_INDEX_MARKER";
const SCHEDULED_MARKER = "FASTPATH_SCHEDULED_MARKER";

interface DistDifference {
  readonly onlyBefore: readonly string[];
  readonly onlyAfter: readonly string[];
  readonly changed: readonly string[];
}

function fail(message: string): never {
  throw new Error(message);
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function assertNoDifference(label: string, difference: DistDifference): void {
  if (
    difference.onlyBefore.length === 0 &&
    difference.onlyAfter.length === 0 &&
    difference.changed.length === 0
  ) {
    return;
  }
  fail(
    [
      `${label}: incremental and full output differ`,
      `  only in before: ${difference.onlyBefore.join(", ") || "(none)"}`,
      `  only in after:  ${difference.onlyAfter.join(", ") || "(none)"}`,
      `  changed:        ${difference.changed.join(", ") || "(none)"}`,
    ].join("\n"),
  );
}

interface FastPathParse {
  readonly used?: boolean;
  readonly blockReason?: string;
  readonly outputFilesHashed?: number;
}

function parseFastPath(output: string): FastPathParse {
  const used = /^ {2}Used {2,}(yes|no)\s*$/m.exec(output)?.[1];
  const blockReason = /^ {2}Block reason {2,}(\S+)\s*$/m.exec(output)?.[1];
  const outputFilesHashed = /^ {2}Output files hashed {2,}(\d+)\s*$/m.exec(
    output,
  )?.[1];
  return {
    used: used === "yes" ? true : used === "no" ? false : undefined,
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
  readonly deletedOutputCount?: number;
  readonly manifestHookCacheHit?: number;
  readonly manifestHookCacheMiss?: number;
  readonly manifestHooksExecuted?: number;
  readonly manifestHooksReused?: number;
  readonly fullRegenerationRequired?: boolean;
}

function readSsgMetrics(file: string): SsgMetrics | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as SsgMetrics;
  } catch {
    return undefined;
  }
}

interface CaseRecord {
  readonly case: string;
  readonly command: string;
  readonly fastPathUsed?: boolean;
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

async function main(): Promise<void> {
  const workspaceRoot = await fsp.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-fast-path-"),
  );
  const tarballDir = path.join(workspaceRoot, "tarballs");
  const siteDir = path.join(workspaceRoot, "starter");
  const metricsDir = path.join(workspaceRoot, "metrics");
  const resultsDir = path.join(os.tmpdir(), "riebeckite-fast-path-results");
  const contentDir = path.join(siteDir, "content");
  const configPath = path.join(siteDir, "riebeckite.config.ts");
  const writingPath = path.join(contentDir, "notes", "writing.md");
  const results: CaseRecord[] = [];
  logger.step(`workspace ${workspaceRoot}`);
  await fsp.mkdir(tarballDir, { recursive: true });
  await fsp.mkdir(metricsDir, { recursive: true });
  await fsp.mkdir(resultsDir, { recursive: true });

  try {
    const packages = await discoverPackages();
    logger.step(`packing ${packages.length} packages`);
    const packed = await packPackages(tarballDir, {
      repoRoot,
      packages,
      concurrency: 1,
      logger,
    });

    const repoCli = path.join(
      repoRoot,
      "packages",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    logger.step("scaffolding standard starter site");
    const scaffold = run(process.execPath, [repoCli, "init", siteDir], {
      cwd: repoRoot,
      env: { RIEBECKITE_BUILD_CONCURRENCY: "1" },
    });
    assert.equal(scaffold.status, 0, "scaffold failed");

    writeFileDependencies(siteDir, packed);

    logger.step("installing site dependencies");
    run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: siteDir,
      env: { RIEBECKITE_BUILD_CONCURRENCY: "1" },
    });

    const installedCli = path.join(
      siteDir,
      "node_modules",
      "@riebeckite",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    if (!fs.existsSync(installedCli)) {
      fail(`installed CLI is missing: ${installedCli}`);
    }

    let caseIndex = 0;
    const build = async (
      name: string,
      options: { full?: boolean; expectFastPath?: boolean } = {},
    ): Promise<CaseRecord> => {
      caseIndex += 1;
      const slug = `${String(caseIndex).padStart(2, "0")}-${slugify(name)}`;
      const metricsPath = path.join(metricsDir, `${slug}.json`);
      await fsp.rm(metricsPath, { force: true });
      const args = ["profile"];
      if (options.full) args.push("--full");
      logger.step(`[${name}] rie... ${args.join(" ")}`);
      const result = run(process.execPath, [installedCli, ...args], {
        cwd: siteDir,
        env: {
          RIEBECKITE_BUILD_CONCURRENCY: "1",
          RIEBECKITE_SSG_METRICS_FILE: metricsPath,
        },
      });
      const output = `${result.stdout}${result.stderr}`;
      await fsp.writeFile(path.join(resultsDir, `${slug}.log`), output);
      const fastPath = parseFastPath(output);
      const content = parseContent(output);
      const ssg = parseSsg(output);
      const metrics = readSsgMetrics(metricsPath);
      const record: CaseRecord = {
        case: name,
        command: args.join(" "),
        fastPathUsed: fastPath.used,
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
      results.push(record);
      logger.step(
        `  fastPath=${record.fastPathUsed ?? "?"} block=${record.blockReason ?? "(none)"} content=${record.contentProcessed}/${record.contentReused} ssgRendered=${record.ssgRendered ?? "-"} hookHit=${record.manifestHookCacheHit ?? "-"} hookMiss=${record.manifestHookCacheMiss ?? "-"}`,
      );
      if (options.expectFastPath !== undefined) {
        assert.equal(
          record.fastPathUsed,
          options.expectFastPath,
          `${name}: expected fastPathUsed=${options.expectFastPath}, got ${record.fastPathUsed} (block=${record.blockReason})`,
        );
      }
      return record;
    };

    const distDir = path.join(siteDir, "dist");
    const snapshot = (): Map<string, string> =>
      snapshotDirectory(distDir).size === 0
        ? fail("dist was not produced")
        : snapshotDirectory(distDir);
    const containing = (marker: string): string[] => {
      if (!fs.existsSync(distDir)) return [];
      return walkFiles(distDir)
        .filter((file) => {
          try {
            return fs.readFileSync(file, "utf8").includes(marker);
          } catch {
            return false;
          }
        })
        .map((file) => path.relative(distDir, file).split(path.sep).join("/"))
        .sort();
    };
    const assertContains = (marker: string, label: string): string[] => {
      const files = containing(marker);
      if (files.length === 0) {
        fail(`${label}: expected ${marker} in dist, found none`);
      }
      return files;
    };
    const assertAbsent = (marker: string, label: string): void => {
      const files = containing(marker);
      if (files.length > 0) {
        fail(`${label}: ${marker} leaked into dist: ${files.join(", ")}`);
      }
    };
    const replaceOnce = (
      text: string,
      pattern: RegExp,
      replacement: string,
      label: string,
    ): string => {
      if (!pattern.test(text)) {
        fail(`${label}: pattern ${String(pattern)} not found`);
      }
      return text.replace(pattern, replacement);
    };
    const readWriting = (): Promise<string> =>
      fsp.readFile(writingPath, "utf8");
    const writeWriting = (text: string): Promise<void> =>
      fsp.writeFile(writingPath, text);

    // 1. Cold build.
    logger.step("case 1: Cold Build");
    const cold = await build("Cold Build", { expectFastPath: false });
    assert.equal(
      cold.viteStartupSkipped,
      false,
      "cold build must not skip Vite",
    );
    const coldSnapshot = snapshot();
    await fsp.writeFile(
      path.join(resultsDir, "cold-dist.sha256.json"),
      `${JSON.stringify(Object.fromEntries(coldSnapshot), null, 2)}\n`,
    );

    // 2. No-change fallback for generated-output planners.
    logger.step("case 2: No-change planner fallback");
    const noChange = await build("No-change Fast Path", {
      expectFastPath: false,
    });
    assert.equal(
      noChange.blockReason,
      "plugin-generated-output-plan",
      "generated-output planners must block the no-change fast path",
    );
    assertNoDifference(
      "no-change vs cold",
      diffSnapshots(coldSnapshot, snapshot()),
    );

    // 3. Content body change.
    logger.step("case 3: Content body change");
    await writeWriting(`${await readWriting()}\n${BODY_MARKER}\n`);
    await build("Content body change", { expectFastPath: false });
    assertContains(BODY_MARKER, "content body change");

    // 4. Frontmatter change.
    logger.step("case 4: Frontmatter change");
    await writeWriting(
      replaceOnce(
        await readWriting(),
        /^title:.*$/m,
        `title: "${TITLE_V2}"`,
        "frontmatter change",
      ),
    );
    await build("Frontmatter change", { expectFastPath: false });
    assertContains(TITLE_V2, "frontmatter change");

    // 5. Content addition.
    logger.step("case 5: Content addition");
    const tempNotePath = path.join(contentDir, "notes", "temp-note.md");
    await fsp.writeFile(
      tempNotePath,
      [
        "---",
        'title: "Temp Note"',
        "date: 2024-01-01",
        "publish: true",
        "---",
        "",
        TEMP_NOTE_MARKER,
        "",
      ].join("\n"),
    );
    await build("Content addition", { expectFastPath: false });
    assertContains(TEMP_NOTE_MARKER, "content addition");

    // 6. Content deletion.
    logger.step("case 6: Content deletion");
    await fsp.rm(tempNotePath, { force: true });
    await build("Content deletion", { expectFastPath: false });
    assertAbsent(TEMP_NOTE_MARKER, "content deletion");

    // 7. Content move.
    logger.step("case 7: Content move");
    const moveSource = path.join(contentDir, "notes", "move-me.md");
    const moveTargetDir = path.join(contentDir, "guides");
    const moveTarget = path.join(moveTargetDir, "move-me.md");
    const moveSourceBody = [
      "---",
      'title: "Move Me"',
      "date: 2024-01-01",
      "publish: true",
      "---",
      "",
      MOVE_MARKER,
      "",
    ].join("\n");
    await fsp.writeFile(moveSource, moveSourceBody);
    const beforeMove = await build("Content move (create)", {
      expectFastPath: false,
    });
    assertContains(MOVE_MARKER, "content move (source)");
    const sourceOutput = path.join(distDir, "notes", "move-me.html");
    if (!fs.existsSync(sourceOutput)) {
      fail("content move (create): notes/move-me.html was not emitted");
    }
    await fsp.mkdir(moveTargetDir, { recursive: true });
    await fsp.rename(moveSource, moveTarget);
    await build("Content move", { expectFastPath: false });
    const targetOutput = path.join(distDir, "guides", "move-me.html");
    if (!fs.existsSync(targetOutput)) {
      fail("content move: guides/move-me.html was not emitted");
    }
    if (!fs.readFileSync(targetOutput, "utf8").includes(MOVE_MARKER)) {
      fail("content move: guides/move-me.html is missing the moved body");
    }
    if (fs.existsSync(sourceOutput)) {
      fail("content move: notes/move-me.html was not removed");
    }
    const previewIndex = fs.readFileSync(
      path.join(distDir, "_riebeckite", "hover-preview", "index.json"),
      "utf8",
    );
    if (!previewIndex.includes('"/guides/move-me"')) {
      fail("content move: the preview index did not relocate the entry");
    }
    if (previewIndex.includes('"/notes/move-me"')) {
      fail("content move: the preview index still references the old location");
    }
    assert.equal(beforeMove.fastPathUsed, false);

    // 8. Plugin options change.
    logger.step("case 8: Plugin options change");
    const configSource = await fsp.readFile(configPath, "utf8");
    await fsp.writeFile(
      configPath,
      replaceOnce(
        configSource,
        /relatedPosts\(\{[^}]*\}\)/,
        "relatedPosts({ limit: 4, useTags: true, useBacklinks: true })",
        "options change",
      ),
    );
    await build("Plugin options change", { expectFastPath: false });

    // 9. public -> draft.
    logger.step("case 9: public -> draft");
    await writeWriting(
      replaceOnce(
        await readWriting(),
        /^publish: true$/m,
        "visibility: draft",
        "public -> draft",
      ),
    );
    await build("public to draft", { expectFastPath: false });
    assertAbsent(BODY_MARKER, "public -> draft");

    // 10. draft -> public.
    logger.step("case 10: draft -> public");
    await writeWriting(
      replaceOnce(
        await readWriting(),
        /^visibility: draft$/m,
        "publish: true",
        "draft -> public",
      ),
    );
    await build("draft to public", { expectFastPath: false });
    assertContains(BODY_MARKER, "draft -> public");

    // 11. unlisted change.
    logger.step("case 11: unlisted");
    await writeWriting(
      replaceOnce(
        await readWriting(),
        /^publish: true$/m,
        "visibility: unlisted",
        "unlisted",
      ),
    );
    await build("unlisted", { expectFastPath: false });
    const unlistedFiles = assertContains(BODY_MARKER, "unlisted");
    const sitemapPath = path.join(distDir, "sitemap.xml");
    if (fs.existsSync(sitemapPath)) {
      const sitemap = fs.readFileSync(sitemapPath, "utf8");
      for (const file of unlistedFiles) {
        const permalink = `/${file.replace(/index\.html$/, "")}`;
        if (sitemap.includes(permalink.replace(/\/$/, ""))) {
          fail(`unlisted content leaked into sitemap: ${permalink}`);
        }
      }
    }

    // 12. Folder README/index add and delete.
    logger.step("case 12: Folder README/index");
    const folderIndexPath = path.join(contentDir, "notes", "index.md");
    await fsp.writeFile(
      folderIndexPath,
      [
        "---",
        'title: "Notes"',
        "publish: true",
        "---",
        "",
        FOLDER_INDEX_MARKER,
        "",
      ].join("\n"),
    );
    await build("Folder index add", { expectFastPath: false });
    assertContains(FOLDER_INDEX_MARKER, "folder index add");
    await fsp.rm(folderIndexPath, { force: true });
    await build("Folder index delete", { expectFastPath: false });
    assertAbsent(FOLDER_INDEX_MARKER, "folder index delete");

    // Extra leakage probe: scheduled content stays unpublished.
    logger.step("case 12b: scheduled content leakage");
    const scheduledPath = path.join(contentDir, "notes", "scheduled.md");
    await fsp.writeFile(
      scheduledPath,
      [
        "---",
        'title: "Scheduled"',
        "date: 2024-01-01",
        "publishAt: 2099-01-01T00:00:00.000Z",
        "---",
        "",
        SCHEDULED_MARKER,
        "",
      ].join("\n"),
    );
    await build("Scheduled content add", { expectFastPath: false });
    assertAbsent(SCHEDULED_MARKER, "scheduled content");
    await fsp.rm(scheduledPath, { force: true });
    await build("Scheduled content delete", { expectFastPath: false });
    assertAbsent(SCHEDULED_MARKER, "scheduled content delete");

    const pristineSnapshot = snapshot();

    // 13. Feed modification.
    logger.step("case 13: Feed modification");
    const feedFile = walkFiles(distDir).find((file) =>
      file.endsWith("feed.xml"),
    );
    assert.ok(feedFile, "standard starter did not emit a feed.xml to tamper");
    await fsp.appendFile(feedFile, "\n<!-- tampered -->\n");
    const feedTampered = await build("Feed modification", {
      expectFastPath: false,
    });
    assert.equal(
      feedTampered.blockReason,
      "plugin-generated-output-plan",
      `generated-output planner must block the fast path before output inventory validation (got ${feedTampered.blockReason})`,
    );
    assertNoDifference(
      "feed modification self-heal",
      diffSnapshots(pristineSnapshot, snapshot()),
    );

    // 14. Feed deletion.
    logger.step("case 14: Feed deletion");
    await fsp.rm(feedFile, { force: true });
    const feedDeleted = await build("Feed deletion", { expectFastPath: false });
    assert.equal(
      feedDeleted.blockReason,
      "plugin-generated-output-plan",
      `generated-output planner must block the fast path before output inventory validation (got ${feedDeleted.blockReason})`,
    );
    assertNoDifference(
      "feed deletion self-heal",
      diffSnapshots(pristineSnapshot, snapshot()),
    );

    // 15. Extra dist file.
    logger.step("case 15: Extra dist file");
    const extraFile = path.join(distDir, "__fast_path_extra__.txt");
    await fsp.writeFile(extraFile, "unexpected\n");
    const extraFileResult = await build("Extra dist file", {
      expectFastPath: false,
    });
    assert.equal(
      extraFileResult.blockReason,
      "plugin-generated-output-plan",
      `generated-output planner must block the fast path before output inventory validation (got ${extraFileResult.blockReason})`,
    );
    if (fs.existsSync(extraFile)) {
      fail("extra dist file was not removed by the recovered build");
    }
    assertNoDifference(
      "extra dist file self-heal",
      diffSnapshots(pristineSnapshot, snapshot()),
    );

    // 16. Full build vs incremental.
    logger.step("case 16: Full Build");
    const incrementalSnapshot = snapshot();
    await fsp.writeFile(
      path.join(resultsDir, "incremental-dist.sha256.json"),
      `${JSON.stringify(Object.fromEntries(incrementalSnapshot), null, 2)}\n`,
    );
    const full = await build("Full Build", {
      full: true,
      expectFastPath: false,
    });
    assert.equal(
      full.blockReason,
      "full-build-requested",
      `full build must report full-build-requested (got ${full.blockReason})`,
    );
    const fullSnapshot = snapshot();
    await fsp.writeFile(
      path.join(resultsDir, "full-dist.sha256.json"),
      `${JSON.stringify(Object.fromEntries(fullSnapshot), null, 2)}\n`,
    );
    assertNoDifference(
      "incremental vs full",
      diffSnapshots(incrementalSnapshot, fullSnapshot),
    );

    // 17. No-change planner fallback recovery.
    logger.step("case 17: No-change planner fallback recovery");
    const recovered = await build("No-change recovery", {
      expectFastPath: false,
    });
    assert.equal(
      recovered.blockReason,
      "plugin-generated-output-plan",
      "recovered no-change build must keep the generated-output planner fallback",
    );
    assertNoDifference(
      "no-change recovery vs full",
      diffSnapshots(fullSnapshot, snapshot()),
    );

    const outputFile = path.join(resultsDir, "f4-4-results.json");
    await fsp.writeFile(
      outputFile,
      `${JSON.stringify({ site: siteDir, results }, null, 2)}\n`,
    );
    logger.step(`results written to ${outputFile}`);

    console.log("\nF4-4 fast path summary");
    console.log(
      "case | fastPath | block | processed/reused | ssg rendered/reused | hookHit/hookMiss | filesHashed",
    );
    for (const record of results) {
      console.log(
        [
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
    logger.step(
      "PASS: standard starter falls back safely for generated-output planners and every change invalidates it safely",
    );
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
