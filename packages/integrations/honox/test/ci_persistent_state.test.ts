import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { type TestContext, test } from "node:test";
import {
  buildSite,
  cachePath,
  configSource,
  contentStatePath,
  createSite,
  diffSnapshotKeys,
  distPath,
  pluginCachePath,
  type SiteSources,
  snapshotTree,
  workParent,
} from "./support/ssg_site.js";

const leanBuildOptions = { adapter: false } as const;

type NoteInput = {
  readonly file: string;
  readonly title: string;
  readonly body: string;
  readonly visibility?: string;
  readonly publishAt?: string;
  readonly aliases?: readonly string[];
};

type CiScenario = {
  readonly name: string;
  readonly beforeNotes: readonly NoteInput[];
  readonly afterNotes: readonly NoteInput[];
  readonly beforeTitle?: string;
  readonly afterTitle?: string;
  readonly beforeConfig?: (siteRoot: string, sources: SiteSources) => string;
  readonly afterConfig?: (siteRoot: string, sources: SiteSources) => string;
  readonly prepareIncremental?: (siteRoot: string) => Promise<void>;
  readonly restoreOutputCache?: boolean;
  readonly expectFullRegeneration?: boolean;
  readonly expectReuse?: boolean;
  readonly expectAffectedOutputs?: number;
};

function noteMarkdown(note: NoteInput): string {
  const frontmatter = [`title: ${note.title}`];
  frontmatter.push(`visibility: ${note.visibility ?? "public"}`);
  if (note.publishAt) frontmatter.push(`publishAt: ${note.publishAt}`);
  if (note.aliases && note.aliases.length > 0) {
    frontmatter.push(
      `aliases: [${note.aliases.map((alias) => `"${alias}"`).join(", ")}]`,
    );
  }
  return `---\n${frontmatter.join("\n")}\n---\n\n${note.body}\n`;
}

const alpha: NoteInput = {
  file: "notes/alpha.md",
  title: "Alpha",
  body: "Alpha body.",
};
const beta: NoteInput = {
  file: "notes/beta.md",
  title: "Beta",
  body: "Beta body.",
};

function sourcesFor(siteRoot: string, title: string): SiteSources {
  return {
    title,
    renderTag: "v1",
    noteCount: 0,
    editedNotes: [],
    buildDirectory: path.join(siteRoot, ".riebeckite"),
  };
}

async function setupSite(
  siteRoot: string,
  notes: readonly NoteInput[],
  title: string,
  config?: (siteRoot: string, sources: SiteSources) => string,
): Promise<void> {
  const sources = sourcesFor(siteRoot, title);
  await createSite(siteRoot, sources);
  if (config) {
    await writeFile(
      path.join(siteRoot, "riebeckite.config.ts"),
      config(siteRoot, sources),
      "utf8",
    );
  }
  for (const note of notes) {
    const file = path.join(siteRoot, "vault", note.file);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, noteMarkdown(note), "utf8");
  }
}

async function copyPath(from: string, to: string): Promise<void> {
  try {
    await cp(from, to, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function copyPersistentState(
  from: string,
  to: string,
  includeOutputCache: boolean,
): Promise<void> {
  await copyPath(pluginCachePath(from), pluginCachePath(to));
  await copyPath(contentStatePath(from), contentStatePath(to));
  if (includeOutputCache) {
    await copyPath(cachePath(from), cachePath(to));
  }
}

async function pathExists(target: string): Promise<boolean> {
  return stat(target)
    .then(() => true)
    .catch(() => false);
}

async function firstJsonFile(directory: string): Promise<string | undefined> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await firstJsonFile(full);
      if (nested) return nested;
    } else if (entry.name.endsWith(".json")) {
      return full;
    }
  }
  return undefined;
}

function withCacheVersion(siteRoot: string, sources: SiteSources): string {
  return configSource(siteRoot, sources).replace(
    '  name: "demo",',
    '  name: "demo",\n  cacheVersion: "2",',
  );
}

function withChangedPluginOutput(
  siteRoot: string,
  sources: SiteSources,
): string {
  return configSource(siteRoot, sources).replace(
    "{ ok: true }",
    "{ ok: false }",
  );
}

function withReorderedPlugins(siteRoot: string, sources: SiteSources): string {
  const extra = [
    "const extra = definePlugin({",
    '  name: "extra",',
    "  buildEnd: ({ output }) => {",
    "    output.emit({",
    '      path: "extra.json",',
    '      content: "extra",',
    '      dependencies: [{ type: "global" }],',
    "    });",
    "  },",
    "});",
    "",
  ].join("\n");
  return configSource(siteRoot, sources)
    .replace(
      "export default defineConfig({",
      `${extra}export default defineConfig({`,
    )
    .replace("plugins: [demo]", "plugins: [extra, demo]");
}

async function runScenario(
  t: TestContext,
  root: string,
  scenario: CiScenario,
): Promise<void> {
  await t.test(scenario.name, async () => {
    const directory = path.join(root, scenario.name);
    const site = path.join(directory, "site");
    const holding = path.join(directory, "state");
    const cold = path.join(directory, "cold");
    const beforeTitle = scenario.beforeTitle ?? "CI";
    const afterTitle = scenario.afterTitle ?? beforeTitle;
    const afterConfig = scenario.afterConfig ?? scenario.beforeConfig;

    await setupSite(
      site,
      scenario.beforeNotes,
      beforeTitle,
      scenario.beforeConfig,
    );
    await buildSite(site, "previous", leanBuildOptions);

    for (const statePath of [
      pluginCachePath(site),
      contentStatePath(site),
      cachePath(site),
    ]) {
      assert.ok(
        await pathExists(statePath),
        `${scenario.name}: previous run must persist ${statePath}`,
      );
    }
    await copyPersistentState(
      site,
      holding,
      scenario.restoreOutputCache ?? false,
    );

    await rm(site, { recursive: true, force: true });
    await setupSite(site, scenario.afterNotes, afterTitle, afterConfig);
    assert.equal(
      await pathExists(distPath(site)),
      false,
      `${scenario.name}: a fresh checkout must not restore dist/`,
    );
    await copyPersistentState(
      holding,
      site,
      scenario.restoreOutputCache ?? false,
    );
    if (scenario.prepareIncremental) {
      await scenario.prepareIncremental(site);
    }

    const metrics = await buildSite(site, "incremental", leanBuildOptions);
    const incrementalSnapshot = await snapshotTree(distPath(site));

    await setupSite(cold, scenario.afterNotes, afterTitle, afterConfig);
    await buildSite(cold, "cold", leanBuildOptions);
    const coldSnapshot = await snapshotTree(distPath(cold));

    assert.deepEqual(
      diffSnapshotKeys(incrementalSnapshot, coldSnapshot),
      [],
      `${scenario.name}: restored-state dist must equal a clean cold dist`,
    );
    if (scenario.expectFullRegeneration !== undefined) {
      assert.equal(
        metrics.fullRegenerationRequired,
        scenario.expectFullRegeneration,
        `${scenario.name}: unexpected fullRegenerationRequired`,
      );
    }
    if (scenario.expectReuse !== undefined) {
      assert.equal(
        Number(metrics.reusedOutputCount) > 0,
        scenario.expectReuse,
        `${scenario.name}: unexpected output reuse`,
      );
    }
    if (scenario.expectAffectedOutputs !== undefined) {
      assert.equal(
        Number(metrics.affectedOutputCount),
        scenario.expectAffectedOutputs,
        `${scenario.name}: unexpected affectedOutputCount`,
      );
    }
  });
}

test("CI persistent build state produces incremental output on a fresh checkout", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "ci-persistent-state-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const scenarios: readonly CiScenario[] = [
    {
      name: "no-change",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha, beta],
      expectFullRegeneration: true,
      expectReuse: false,
      expectAffectedOutputs: 0,
    },
    {
      name: "body-edit",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "frontmatter-edit",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, title: "Alpha renamed" }, beta],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "alias-edit",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, aliases: ["alpha-alias"] }, beta],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "add",
      beforeNotes: [alpha, beta],
      afterNotes: [
        alpha,
        beta,
        { file: "notes/gamma.md", title: "Gamma", body: "Gamma body." },
      ],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "delete",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "rename",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, file: "notes/alpha-renamed.md" }, beta],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "visibility-change",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, visibility: "draft" }, beta],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "publishAt-change",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, publishAt: "2999-01-01T00:00:00Z" }, beta],
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "config-change",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha, beta],
      beforeTitle: "Before",
      afterTitle: "After",
      expectFullRegeneration: true,
    },
    {
      name: "plugin-config-change",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha, beta],
      afterConfig: withChangedPluginOutput,
    },
    {
      name: "plugin-ordering-change",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha, beta],
      afterConfig: withReorderedPlugins,
    },
    {
      name: "cacheVersion-change",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha, beta],
      afterConfig: withCacheVersion,
    },
    {
      name: "cache-missing",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        await rm(pluginCachePath(siteRoot), { recursive: true, force: true });
        await rm(contentStatePath(siteRoot), { force: true });
        await rm(cachePath(siteRoot), { force: true });
      },
      expectFullRegeneration: true,
    },
    {
      name: "pcc-only",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        await rm(contentStatePath(siteRoot), { force: true });
        await rm(cachePath(siteRoot), { force: true });
      },
      expectFullRegeneration: true,
    },
    {
      name: "content-state-only",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        await rm(pluginCachePath(siteRoot), { recursive: true, force: true });
        await rm(cachePath(siteRoot), { force: true });
      },
      expectFullRegeneration: true,
    },
    {
      name: "pcc-content-state-only",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        await rm(cachePath(siteRoot), { force: true });
      },
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "output-cache-no-change",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha, beta],
      restoreOutputCache: true,
      expectFullRegeneration: false,
      expectReuse: true,
    },
    {
      name: "output-cache-body-edit",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      restoreOutputCache: true,
      expectFullRegeneration: false,
      expectReuse: true,
    },
    {
      name: "output-cache-delete",
      beforeNotes: [alpha, beta],
      afterNotes: [alpha],
      restoreOutputCache: true,
      expectFullRegeneration: false,
      expectReuse: true,
    },
    {
      name: "output-cache-rename",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, file: "notes/alpha-renamed.md" }, beta],
      restoreOutputCache: true,
      expectFullRegeneration: false,
      expectReuse: true,
    },
    {
      name: "output-cache-only",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        await rm(pluginCachePath(siteRoot), { recursive: true, force: true });
        await rm(contentStatePath(siteRoot), { force: true });
      },
      restoreOutputCache: true,
      expectFullRegeneration: false,
      expectReuse: false,
    },
    {
      name: "content-state-corruption",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        await writeFile(contentStatePath(siteRoot), "{ not valid json", "utf8");
      },
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "output-cache-corruption",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        await writeFile(cachePath(siteRoot), "{ not valid json", "utf8");
      },
      restoreOutputCache: true,
      expectFullRegeneration: true,
    },
    {
      name: "pcc-corruption",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        const target = await firstJsonFile(pluginCachePath(siteRoot));
        assert.ok(target, "PCC must contain a JSON entry to corrupt");
        await writeFile(target, "{ not valid json", "utf8");
      },
      expectFullRegeneration: true,
      expectReuse: false,
    },
    {
      name: "state-schema-mismatch",
      beforeNotes: [alpha, beta],
      afterNotes: [{ ...alpha, body: "Alpha body edited." }, beta],
      prepareIncremental: async (siteRoot) => {
        const state = JSON.parse(
          await readFile(contentStatePath(siteRoot), "utf8"),
        ) as { version: number };
        state.version = 999;
        await writeFile(
          contentStatePath(siteRoot),
          JSON.stringify(state),
          "utf8",
        );
      },
      expectFullRegeneration: true,
      expectReuse: false,
    },
  ];

  for (const scenario of scenarios) {
    await runScenario(t, root, scenario);
  }
});
