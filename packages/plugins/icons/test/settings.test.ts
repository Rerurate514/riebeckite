import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { resolveIconsOptions } from "../src/resolve.js";
import { loadIconsSettings } from "../src/settings.js";

async function vault(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "riebeckite-icons-"));
}

function config(root: string): ResolvedRiebeckiteConfig {
  return {
    content: { directory: path.join(root, "content") },
  } as ResolvedRiebeckiteConfig;
}

test("loads real Iconize and Iconic files and infers the vault prefix", async () => {
  const root = await vault();
  await mkdir(path.join(root, "content"), { recursive: true });
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
      migrated: 1,
      settings: { iconIdentifier: ":", iconColor: "ff0000" },
      "content/note.md": { iconName: "LiRocket" },
      "content/folder": "LiBook",
    }),
  );
  await writeFile(
    path.join(root, ".obsidian", "plugins", "iconic", "data.json"),
    JSON.stringify({
      fileIcons: { "content/other.md": { icon: "lucide-star" } },
      tagIcons: { guide: { icon: "lucide-book" } },
      propertyIcons: { Status: { icon: "🚀" } },
    }),
  );

  const loaded = await loadIconsSettings(resolveIconsOptions({}), config(root));
  assert.equal(loaded.vaultPrefix, "content/");
  assert.equal(
    loaded.iconize?.icons.get("content/note.md")?.iconName,
    "LiRocket",
  );
  assert.equal(loaded.iconize?.icons.get("content/folder")?.iconName, "LiBook");
  assert.equal(
    loaded.iconic?.fileIcons["content/other.md"]?.icon,
    "lucide-star",
  );
  assert.equal(loaded.iconic?.tagIcons.guide?.icon, "lucide-book");
  assert.deepEqual(loaded.diagnostics, []);
});

test("missing settings are a no-op", async () => {
  const root = await vault();
  const loaded = await loadIconsSettings(resolveIconsOptions({}), config(root));
  assert.equal(loaded.iconize, undefined);
  assert.equal(loaded.iconic, undefined);
  assert.deepEqual(loaded.diagnostics, []);
  assert.equal(loaded.vaultPrefix, "");
});

test("broken JSON is reported and does not throw", async () => {
  const root = await vault();
  await mkdir(path.join(root, ".obsidian", "plugins", "iconic"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, ".obsidian", "plugins", "iconic", "data.json"),
    "{",
  );
  const loaded = await loadIconsSettings(resolveIconsOptions({}), config(root));
  assert.equal(loaded.iconic, undefined);
  assert.ok(
    loaded.diagnostics.some((item) => item.code === "icons-invalid-settings"),
  );
});

test("explicit data files outside the vault are rejected", async () => {
  const root = await vault();
  const outside = path.join(root, "..", "iconic-outside.json");
  const loaded = await loadIconsSettings(
    resolveIconsOptions({ iconic: { dataFile: outside }, vaultRoot: root }),
    config(root),
  );
  assert.equal(loaded.iconic, undefined);
  assert.ok(
    loaded.diagnostics.some(
      (item) => item.code === "icons-untrusted-settings-path",
    ),
  );
});

test("explicit data files inside the vault are read", async () => {
  const root = await vault();
  await writeFile(
    path.join(root, "icons.json"),
    JSON.stringify({ tagIcons: { x: { icon: "lucide-star" } } }),
  );
  const loaded = await loadIconsSettings(
    resolveIconsOptions({
      iconic: { dataFile: "icons.json" },
      vaultRoot: root,
    }),
    config(root),
  );
  assert.equal(loaded.iconic?.tagIcons.x?.icon, "lucide-star");
});

test("custom folder packs are discovered without reading SVG contents", async () => {
  const root = await vault();
  await mkdir(path.join(root, ".obsidian", "icons", "MyPack"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, ".obsidian", "icons", "MyPack", "Rocket.svg"),
    '<svg viewBox="0 0 24 24"><path d="M0 0h1v1z"/></svg>',
  );
  const loaded = await loadIconsSettings(resolveIconsOptions({}), config(root));
  const pack = loaded.iconPacks.get("mypack");
  assert.ok(pack?.has("rocket"));
  assert.match(pack?.get("rocket")?.filePath ?? "", /Rocket\.svg$/);
});
