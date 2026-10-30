import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import {
  composeScaffoldPreset,
  parseScaffoldFeatures,
  SCAFFOLD_FEATURE_NAMES,
} from "../src/scaffold/features.js";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import {
  isScaffoldPresetName,
  SCAFFOLD_DEFAULT_PRESET,
  SCAFFOLD_PRESET_NAMES,
  scaffoldPresets,
  validateScaffoldPreset,
} from "../src/scaffold/presets.js";
import { RIEBECKITE_VERSION } from "../src/scaffold/version.js";

test("the public scaffold presets have the documented order and default", () => {
  assert.deepEqual(SCAFFOLD_PRESET_NAMES, [
    "starter",
    "digital-garden",
    "blog",
    "docs",
    "portfolio",
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

test("feature packs add explicit config without duplicating preset plugins", () => {
  const features = parseScaffoldFeatures("diagrams,i18n");
  const preset = composeScaffoldPreset(scaffoldPresets.portfolio, features);
  assert.deepEqual(preset.languages, ["en", "ja"]);
  assert.ok(preset.plugins.some((plugin) => plugin.factory === "mermaidPele"));
  const withMedia = composeScaffoldPreset(scaffoldPresets.portfolio, ["media"]);
  assert.equal(
    withMedia.plugins.filter((plugin) => plugin.factory === "media").length,
    1,
  );
  assert.throws(() => parseScaffoldFeatures("diagrams,diagrams"), /repeated/);
});

test("every preset supports every feature pack", () => {
  for (const preset of Object.values(scaffoldPresets)) {
    const composed = composeScaffoldPreset(preset, SCAFFOLD_FEATURE_NAMES);
    assert.deepEqual(
      composed.plugins.map((plugin) => `${plugin.package}:${plugin.factory}`),
      [
        ...new Set(
          composed.plugins.map(
            (plugin) => `${plugin.package}:${plugin.factory}`,
          ),
        ),
      ],
    );
    assert.ok(composed.languages.includes("en"));
    assert.ok(composed.languages.includes("ja"));
  }
});

test("feature packs are written to generated configuration", async () => {
  await withTemporaryDirectory(async (directory) => {
    await scaffoldRiebeckiteSite({
      targetDirectory: directory,
      preset: "portfolio",
      features: ["diagrams", "i18n"],
    });
    const config = await fs.readFile(
      path.join(directory, "riebeckite.config.ts"),
      "utf8",
    );
    assert.match(config, /@riebeckite\/plugin-mermaid-pele/);
    assert.match(config, /defaultLang: "en"/);
  });
});

test("purpose presets select their purpose-built theme", async () => {
  const expectedThemes = {
    "digital-garden": ["@riebeckite/theme-garden", "gardenTheme"],
    blog: ["@riebeckite/theme-editorial", "editorialTheme"],
    docs: ["@riebeckite/theme-technical", "technicalTheme"],
    portfolio: ["@riebeckite/theme-folio", "folioTheme"],
  } as const;
  await withTemporaryDirectory(async (directory) => {
    for (const [preset, [packageName, factory]] of Object.entries(
      expectedThemes,
    )) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({
        targetDirectory,
        preset: preset as keyof typeof expectedThemes,
      });
      const config = await fs.readFile(
        path.join(targetDirectory, "riebeckite.config.ts"),
        "utf8",
      );
      const packageJson = JSON.parse(
        await fs.readFile(path.join(targetDirectory, "package.json"), "utf8"),
      ) as { dependencies?: Record<string, string> };
      assert.match(
        config,
        new RegExp(`import \\{ ${factory} \\} from "${packageName}"`),
      );
      assert.match(config, new RegExp(`theme: ${factory}\\(\\)`));
      assert.equal(packageJson.dependencies?.[packageName], RIEBECKITE_VERSION);
    }
  });
});

test("portfolio registers every plugin used by its article layout", async () => {
  await withTemporaryDirectory(async (directory) => {
    await scaffoldRiebeckiteSite({
      targetDirectory: directory,
      preset: "portfolio",
    });
    const config = await fs.readFile(
      path.join(directory, "riebeckite.config.ts"),
      "utf8",
    );
    for (const plugin of ["backlinks", "relatedPosts", "recentPosts"]) {
      assert.match(config, new RegExp(`\\b${plugin}\\(`));
    }
  });
});

test("preset declarations reject conflicting generated imports", () => {
  assert.throws(
    () =>
      validateScaffoldPreset({
        ...scaffoldPresets.minimal,
        plugins: [
          { package: "@example/one", factory: "plugin" },
          { package: "@example/two", factory: "plugin" },
        ],
      }),
    /imports "plugin" from both/,
  );
  assert.throws(
    () =>
      validateScaffoldPreset({
        ...scaffoldPresets.minimal,
        plugins: [
          { package: "@example/plugin", factory: "plugin" },
          { package: "@example/plugin", factory: "plugin" },
        ],
      }),
    /more than once/,
  );
});
