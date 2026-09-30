import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import {
  isScaffoldPresetName,
  SCAFFOLD_DEFAULT_PRESET,
  SCAFFOLD_PRESET_NAMES,
  scaffoldPresets,
} from "../src/scaffold/presets.js";

test("the public scaffold presets have the documented order and default", () => {
  assert.deepEqual(SCAFFOLD_PRESET_NAMES, [
    "starter",
    "minimal",
    "showcase",
    "empty",
  ]);
  assert.equal(SCAFFOLD_DEFAULT_PRESET, "starter");
  assert.deepEqual(Object.keys(scaffoldPresets), SCAFFOLD_PRESET_NAMES);
  for (const removedName of ["rich", "full", "max", "ultra"]) {
    assert.equal(isScaffoldPresetName(removedName), false);
  }
});

test("each preset generates its intended self-contained composition", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const config = await fs.readFile(
        path.join(targetDirectory, "riebeckite.config.ts"),
        "utf8",
      );
      assert.ok(await exists(path.join(targetDirectory, "README.md")));
      assert.ok(await exists(path.join(targetDirectory, "public/favicon.ico")));
      assert.ok(
        await exists(path.join(targetDirectory, "public/riebeckite-logo.png")),
      );
      const renderer = await fs.readFile(
        path.join(targetDirectory, "app/routes/_renderer.tsx"),
        "utf8",
      );
      assert.match(renderer, /rel="icon" href="\/favicon\.ico"/);
      if (preset === "empty") {
        assert.ok(!config.includes("@riebeckite/plugin-"));
      } else {
        assert.ok(config.includes("@riebeckite/plugin-obsidian-markdown"));
        const headerPath = path.join(
          targetDirectory,
          "app/components/site-header.tsx",
        );
        if (await exists(headerPath)) {
          const header = await fs.readFile(headerPath, "utf8");
          assert.match(header, /\/riebeckite-logo\.png/);
        }
        const slugRoute = await fs.readFile(
          path.join(targetDirectory, "app/routes/[slug{.+}].tsx"),
          "utf8",
        );
        assert.match(slugRoute, /resolveRiebeckiteRoute/);
        assert.match(slugRoute, /pluginPageSsgParams/);
      }
      if (preset === "showcase") {
        assert.ok(
          await exists(path.join(targetDirectory, "content/examples.md")),
        );
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/drawings/site.canvas"),
          ),
        );
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/reference/plugins.md"),
          ),
        );
        assert.ok(
          await exists(path.join(targetDirectory, "content/images/demo.svg")),
        );
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/attachments/project-brief.pdf"),
          ),
        );
        assert.ok(config.includes("@riebeckite/plugin-mermaid"));
      }
      if (preset === "starter") {
        assert.ok(config.includes("@riebeckite/plugin-search"));
        assert.ok(
          await exists(path.join(targetDirectory, "content/notes/planning.md")),
        );
        assert.ok(!config.includes("@riebeckite/plugin-mermaid"));
      }
    }
  });
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withTemporaryDirectory(
  callback: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-"));
  try {
    await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
