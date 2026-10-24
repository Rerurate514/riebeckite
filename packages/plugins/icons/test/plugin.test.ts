import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContentManifest } from "@riebeckite/core";
import { icons } from "../index.js";
import { entry } from "./helpers.js";

test("the plugin resolves one model for entries, folders, tags, and properties", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "riebeckite-icons-plugin-"),
  );
  await mkdir(path.join(root, ".obsidian", "plugins", "obsidian-icon-folder"), {
    recursive: true,
  });
  await mkdir(path.join(root, ".obsidian", "plugins", "iconic"), {
    recursive: true,
  });
  await writeFile(
    path.join(
      root,
      ".obsidian",
      "plugins",
      "obsidian-icon-folder",
      "data.json",
    ),
    JSON.stringify({
      "notes/tagged.md": { iconName: "LiRocket" },
      notes: { iconName: "LiFolder" },
    }),
  );
  await writeFile(
    path.join(root, ".obsidian", "plugins", "iconic", "data.json"),
    JSON.stringify({
      tagIcons: { guide: { icon: "lucide-book" } },
      propertyIcons: { Status: { icon: "lucide-star" } },
    }),
  );

  const plugin = icons({ vaultRoot: root });
  const resolved = await plugin.resolveExternalDependencies?.({
    config: { content: { directory: root } } as never,
    contentIndex: new Map(),
    cache: {} as never,
  });
  assert.ok(resolved);
  const snapshot = resolved[0];
  assert.equal(snapshot?.kind, "resolved");
  assert.deepEqual(
    snapshot?.kind === "resolved" ? snapshot.snapshot.scope : undefined,
    { type: "all" },
  );
  assert.deepEqual(
    snapshot?.kind === "resolved" ? snapshot.snapshot.value : undefined,
    { version: 1 },
  );

  const tagged = entry("notes/tagged", { Status: "done" }, ["guide"]);
  const manifest = {
    entries: [tagged],
    folderLocations: new Map([
      ["/notes", { folder: "notes", pathname: "/notes" }],
    ]),
  } as unknown as ContentManifest;
  await plugin.onManifestCreated?.({
    manifest,
    contentIndex: new Map(),
    diagnostics: [],
    cache: {} as never,
    output: {} as never,
    logger: {} as never,
    tracer: {} as never,
  });

  assert.equal(tagged.icon?.id, "lucide:rocket");
  assert.equal(tagged.icon?.source, "iconize");
  assert.equal(manifest.icons?.folders?.notes?.id, "lucide:folder");
  assert.equal(manifest.icons?.tags?.guide?.id, "lucide:book");
  assert.equal(manifest.icons?.properties?.Status?.id, "lucide:star");
  assert.equal(
    manifest.folderLocations.get("/notes")?.icon?.id,
    "lucide:folder",
  );
  assert.equal(plugin.clientEntries, undefined);
  assert.deepEqual(
    plugin.assets?.map((asset) => asset.kind),
    ["style"],
  );
});
