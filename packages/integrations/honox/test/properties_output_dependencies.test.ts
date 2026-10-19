import assert from "node:assert/strict";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildSite,
  createSite,
  diffSnapshotKeys,
  distPath,
  incrementalBuild,
  snapshotTree,
  workParent,
} from "./support/ssg_site.js";

const leanBuildOptions = { adapter: false } as const;

type Scenario = {
  readonly name: string;
  readonly targetVisibility: "public" | "draft";
  readonly sourceRelation: string;
  readonly apply: (site: string) => Promise<void>;
};

test("Properties WikiLink output dependencies match clean builds across publication changes", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "properties-output-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const site = path.join(root, scenario.name);
      await createPropertiesSite(site, scenario);
      await buildSite(site, "initial", leanBuildOptions);

      await scenario.apply(site);
      const incremental = await incrementalBuild(
        site,
        "incremental",
        leanBuildOptions,
      );
      assert.equal(incremental.fullRegenerationRequired, false);
      const incrementalSnapshot = await snapshotTree(distPath(site));

      await rm(path.join(site, ".riebeckite"), {
        recursive: true,
        force: true,
      });
      await rm(path.join(site, "vault", ".riebeckite"), {
        recursive: true,
        force: true,
      });
      await rm(distPath(site), { recursive: true, force: true });
      await buildSite(site, "cold", leanBuildOptions);
      assert.deepEqual(
        diffSnapshotKeys(
          incrementalSnapshot,
          await snapshotTree(distPath(site)),
        ),
        [],
        `${scenario.name}: incremental output must equal a clean cold build`,
      );
    });
  }
});

const scenarios: readonly Scenario[] = [
  {
    name: "resolved-display-article",
    targetVisibility: "public",
    sourceRelation: "[[target]]",
    apply: (site) => updateTargetTitle(site, "Target updated"),
  },
  {
    name: "unrelated-article",
    targetVisibility: "public",
    sourceRelation: "[[target]]",
    apply: (site) => writeUnrelated(site),
  },
  {
    name: "add-target",
    targetVisibility: "public",
    sourceRelation: "[[later]]",
    apply: (site) => writeTarget(site, "later", "public"),
  },
  {
    name: "delete-target",
    targetVisibility: "public",
    sourceRelation: "[[target]]",
    apply: (site) => rm(targetPath(site)),
  },
  {
    name: "rename-target",
    targetVisibility: "public",
    sourceRelation: "[[target]]",
    apply: (site) =>
      rename(targetPath(site), path.join(site, "vault", "renamed.md")),
  },
  {
    name: "public-to-draft",
    targetVisibility: "public",
    sourceRelation: "[[target]]",
    apply: (site) => writeTarget(site, "target", "draft"),
  },
  {
    name: "draft-to-public",
    targetVisibility: "draft",
    sourceRelation: "[[target]]",
    apply: (site) => writeTarget(site, "target", "public"),
  },
  {
    name: "unresolved-fallback",
    targetVisibility: "public",
    sourceRelation: "[[missing]]",
    apply: (site) => writeUnrelated(site),
  },
];

async function createPropertiesSite(
  site: string,
  scenario: Scenario,
): Promise<void> {
  await createSite(site, {
    title: "Properties output dependencies",
    renderTag: "v1",
    noteCount: 0,
    editedNotes: [],
    properties: true,
  });
  await mkdir(path.join(site, "vault"), { recursive: true });
  await writeFile(
    path.join(site, "vault", "source.md"),
    note("Source", "public", `related: "${scenario.sourceRelation}"`),
    "utf8",
  );
  await writeTarget(site, "target", scenario.targetVisibility);
}

async function writeTarget(
  site: string,
  slug: string,
  visibility: "public" | "draft",
): Promise<void> {
  await writeFile(
    path.join(site, "vault", `${slug}.md`),
    note("Target", visibility),
    "utf8",
  );
}

async function updateTargetTitle(site: string, title: string): Promise<void> {
  await writeFile(targetPath(site), note(title, "public"), "utf8");
}

async function writeUnrelated(site: string): Promise<void> {
  await writeFile(
    path.join(site, "vault", "unrelated.md"),
    note("Unrelated", "public"),
    "utf8",
  );
}

function targetPath(site: string): string {
  return path.join(site, "vault", "target.md");
}

function note(
  title: string,
  visibility: "public" | "draft",
  extra = "",
): string {
  return `---\ntitle: ${title}\nvisibility: ${visibility}${extra ? `\n${extra}` : ""}\n---\n\n# ${title}\n`;
}
