import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ContentManager,
  type ContentManifest,
  createContentMigrationRegistry,
  defineContentMigration,
  defineDerivedView,
  definePlugin,
  type RiebeckitePlugin,
  resolveConfig,
} from "@riebeckite/core";
import { alias } from "../../plugins/alias/index.js";
import { l10n } from "../../plugins/l10n/index.js";
import { permalink } from "../../plugins/permalink/index.js";
import {
  FileSystemContentMigration,
  FileSystemContentSource,
} from "../index.js";

const files: Record<string, string> = {
  "legacy/post.md":
    "---\nid: post\ntitle: Legacy post\ncategory: programming\npublished: true\naliases:\n  - old-post\n---\nSee [[legacy/other]].\n",
  "legacy/other.md":
    "---\nid: other\ntitle: Legacy other\ncategory: design\npublished: true\n---\nBack to [[legacy/post]].\n",
  "draft.md":
    "---\nid: draft\ntitle: Draft note\ncategory: programming\npublished: true\nvisibility: draft\n---\nDraft body\n",
  "unlisted.md":
    "---\nid: unlisted\ntitle: Unlisted note\ncategory: design\npublished: true\nvisibility: unlisted\n---\nUnlisted body\n",
  "scheduled.md":
    "---\nid: scheduled\ntitle: Scheduled note\ncategory: design\npublished: true\npublishAt: 2099-01-01T00:00:00.000Z\n---\nScheduled body\n",
  "guide.ja.md":
    "---\nid: guide-ja\ntitle: ガイド\ncategory: docs\npublished: true\n---\n日本語\n",
  "guide.en.md":
    "---\nid: guide-en\ntitle: Guide\ncategory: docs\npublished: true\n---\nEnglish\n",
};

function plugins(): readonly RiebeckitePlugin[] {
  return [
    permalink(),
    alias(),
    l10n({ defaultLang: "ja", languages: ["ja", "en"] }),
    definePlugin({
      name: "migration-e2e-derived",
      derivedViews: [
        defineDerivedView<number, number>({
          id: "migration-e2e.total",
          version: "1",
          compute: async (value) => value,
        }),
      ],
    }),
  ];
}

function config(root: string, commit: boolean) {
  const buildDirectory = path.join(root, ".riebeckite");
  return {
    ...resolveConfig({
      site: { title: "Migration fixture" },
      content: {
        directory: root,
        filters: { publishStrategy: "selective" },
      },
      cache: {
        enabled: commit,
        directory: path.join(buildDirectory, "cache"),
      },
    }),
    buildDirectory,
  };
}

async function build(
  root: string,
  options: {
    readonly incremental: boolean;
    readonly commit: boolean;
  },
): Promise<{
  readonly manifest: ContentManifest;
  readonly hash: string;
  readonly derivedViews: number;
  readonly hasProvenance: boolean;
}> {
  const manager = new ContentManager(new FileSystemContentSource(root), [], {
    config: config(root, options.commit),
    plugins: [...plugins()],
    commitBuildState: options.commit,
    publishingBuildTime: new Date("2026-01-01T00:00:00.000Z"),
  });
  try {
    const manifest = await manager.getManifest({
      incremental: options.incremental,
    });
    const snapshot = manager.getCompletedBuildSnapshot();
    return {
      manifest,
      hash: outputHash(manifest),
      derivedViews: snapshot?.derivedViews.length ?? 0,
      hasProvenance: snapshot?.provenance !== undefined,
    };
  } finally {
    await manager.dispose();
  }
}

function outputHash(manifest: ContentManifest): string {
  const entries = manifest.entries
    .map((entry) => ({
      slug: entry.slug,
      contentId: entry.contentId,
      permalink: entry.permalink,
      html: entry.html,
      visibility: entry.publishing.visibility,
      publishAt: entry.publishing.publishAt?.toISOString(),
      redirects: entry.publicLocation.redirects ?? [],
    }))
    .toSorted((left, right) => left.slug.localeCompare(right.slug));
  const redirects = [...manifest.publicRedirects.entries()]
    .map(([from, redirect]) => ({ from, ...redirect }))
    .toSorted((left, right) => left.from.localeCompare(right.from));
  return createHash("sha256")
    .update(JSON.stringify({ entries, redirects }))
    .digest("hex");
}

async function treeHash(
  root: string,
  include: (relative: string) => boolean,
): Promise<string> {
  const files: { path: string; content: Buffer }[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (entry.name === ".riebeckite" && include(relative)) continue;
        await visit(absolute);
      } else if (include(relative)) {
        files.push({ path: relative, content: await fs.readFile(absolute) });
      }
    }
  }
  await visit(root);
  files.sort((left, right) => left.path.localeCompare(right.path));
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function contentHash(root: string): Promise<string> {
  return treeHash(root, (relative) => !relative.startsWith(".riebeckite"));
}

function buildStateHash(root: string): Promise<string> {
  return treeHash(
    root,
    (relative) =>
      relative.startsWith(".riebeckite") &&
      !relative.startsWith(".riebeckite/mutations") &&
      !relative.startsWith(".riebeckite/migrations"),
  );
}

test("migrates a real fixture and keeps build, publication and localization stable", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-site-"));
  try {
    for (const [file, content] of Object.entries(files)) {
      const target = path.join(root, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
    }
    const registry = createContentMigrationRegistry([
      defineContentMigration({
        id: "legacy-frontmatter",
        version: 1,
        description: "Normalize legacy frontmatter.",
        rules: [
          { kind: "frontmatter-map", key: "category", map: (value) => [value] },
          { kind: "frontmatter-rename", from: "category", to: "tags" },
          {
            kind: "frontmatter-set",
            key: "visibility",
            value: "public",
            when: (content) =>
              content.frontmatter.published === true &&
              content.frontmatter.visibility === undefined,
          },
          { kind: "frontmatter-remove", key: "published" },
        ],
      }),
      defineContentMigration({
        id: "move-guides",
        version: 1,
        description: "Move legacy notes under guides.",
        dependsOn: ["legacy-frontmatter"],
        rules: [{ kind: "path-rename", from: "legacy", to: "guides" }],
      }),
      defineContentMigration({
        id: "post-permalink",
        version: 1,
        description: "Give the legacy post a stable URL.",
        dependsOn: ["move-guides"],
        rules: [
          {
            kind: "permalink",
            permalink: "/posts/post",
            when: (content) => content.frontmatter.id === "post",
          },
        ],
      }),
    ]);
    const migrationConfig = config(root, false);
    const migration = new FileSystemContentMigration({
      contentDirectory: root,
      registry,
      config: migrationConfig,
      plugins: [...plugins()],
      buildTime: new Date("2026-01-01T00:00:00.000Z"),
    });

    const beforeIncremental = await build(root, {
      incremental: false,
      commit: true,
    });
    const beforePost = beforeIncremental.manifest.bySlug.get("legacy/post");
    assert.ok(beforePost);
    const beforePermalink = beforePost.permalink;
    const stateBefore = await buildStateHash(root);
    const beforeMigration = await contentHash(root);
    const beforePublication = await migration
      .plan()
      .then((plan) => plan.verification);
    assert.match(
      beforePublication.beforePublicationFingerprint,
      /^[0-9a-f]{64}$/,
    );
    assert.ok(beforeIncremental.derivedViews > 0);
    assert.equal(beforeIncremental.hasProvenance, true);

    const plan = await migration.plan();
    assert.deepEqual(plan.conflicts, []);
    assert.equal(await contentHash(root), beforeMigration);
    assert.equal(await buildStateHash(root), stateBefore);
    assert.ok(plan.changes.some((change) => change.afterFingerprint === null));
    assert.ok(plan.changes.some((change) => change.path === "guides/post.md"));

    const applied = await migration.apply({
      planPath: await migration.savePlan(plan),
    });
    assert.equal(applied.applied, true);
    assert.equal(await buildStateHash(root), stateBefore);

    const migrated = await fs.readFile(
      path.join(root, "guides", "post.md"),
      "utf8",
    );
    assert.match(migrated, /tags:\n {2}- programming/);
    assert.match(migrated, /visibility: public/);
    assert.match(migrated, /\[\[guides\/other\]\]/);
    assert.doesNotMatch(migrated, /published: true/);

    const after = await build(root, { incremental: false, commit: false });
    const incremental = await build(root, { incremental: true, commit: true });
    assert.equal(after.hash, incremental.hash);
    assert.notEqual(after.hash, beforeIncremental.hash);
    assert.deepEqual(
      await migration.history().then((history) => history.runs.at(-1)?.status),
      "success",
    );
    assert.equal((await migration.status()).entries.length, 3);

    const post = after.manifest.bySlug.get("guides/post");
    assert.equal(post?.permalink, "/posts/post");
    assert.equal(
      after.manifest.publicRedirects.has(beforePermalink) ||
        after.manifest.redirects.has(beforePermalink),
      true,
      `expected a redirect from ${beforePermalink}`,
    );
    assert.equal(after.manifest.bySlug.get("guides/other")?.contentId, "other");
    assert.equal(
      after.manifest.bySlug.get("guide.ja")?.publicLocation.language,
      "ja",
    );
    assert.equal(
      after.manifest.bySlug.get("guide.en")?.publicLocation.language,
      "en",
    );
    assert.equal(
      after.manifest.bySlug.get("draft")?.publishing.visibility,
      "draft",
    );
    assert.equal(
      after.manifest.bySlug.get("unlisted")?.publishing.visibility,
      "unlisted",
    );
    assert.equal(
      after.manifest.bySlug.get("scheduled")?.publishing.visibility,
      "scheduled",
    );

    const rollback = await migration.rollback({ planId: applied.plan.id });
    assert.equal(rollback.rolledBack, true);
    assert.equal(await contentHash(root), beforeMigration);
    const restored = await build(root, { incremental: false, commit: false });
    assert.equal(restored.hash, beforeIncremental.hash);
    assert.equal(await buildStateHash(root), stateBefore);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
