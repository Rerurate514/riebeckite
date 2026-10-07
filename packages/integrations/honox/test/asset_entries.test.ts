import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { writeRiebeckiteAssetEntries } from "../src/asset_entries.js";

test("asset entries are not rewritten when their contents are unchanged", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "riebeckite-assets-"));
  const frameworkStyles = path.join(directory, "framework-styles.css");
  const pluginStyles = path.join(directory, "plugin-styles.css");
  const themeStyles = path.join(directory, "theme-styles.css");
  const config = {
    plugins: [
      {
        name: "example",
        assets: [{ kind: "style", moduleSpecifier: "@example/plugin.css" }],
      },
    ],
    theme: { styles: [{ moduleSpecifier: "@example/theme.css" }] },
  } as ResolvedRiebeckiteConfig;

  try {
    writeRiebeckiteAssetEntries(config, {
      frameworkStyles,
      pluginStyles,
      themeStyles,
    });
    const timestamp = new Date("2020-01-01T00:00:00.000Z");
    await Promise.all([
      utimes(frameworkStyles, timestamp, timestamp),
      utimes(pluginStyles, timestamp, timestamp),
      utimes(themeStyles, timestamp, timestamp),
    ]);

    writeRiebeckiteAssetEntries(config, {
      frameworkStyles,
      pluginStyles,
      themeStyles,
    });

    assert.equal(
      (await stat(frameworkStyles)).mtime.getTime(),
      timestamp.getTime(),
    );
    assert.equal(
      (await stat(pluginStyles)).mtime.getTime(),
      timestamp.getTime(),
    );
    assert.equal(
      (await stat(themeStyles)).mtime.getTime(),
      timestamp.getTime(),
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("generated entries import the framework, plugin, and theme stylesheets", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "riebeckite-assets-"));
  const frameworkStyles = path.join(directory, "framework-styles.css");
  const pluginStyles = path.join(directory, "plugin-styles.css");
  const themeStyles = path.join(directory, "theme-styles.css");
  const config = {
    plugins: [
      {
        name: "navigation",
        assets: [
          {
            kind: "style",
            moduleSpecifier: "@riebeckite/plugin-navigation/style.css",
          },
        ],
      },
    ],
    theme: {
      styles: [{ moduleSpecifier: "@riebeckite/theme-default/style.css" }],
    },
  } as ResolvedRiebeckiteConfig;

  try {
    writeRiebeckiteAssetEntries(config, {
      frameworkStyles,
      pluginStyles,
      themeStyles,
    });

    assert.match(
      await readFile(frameworkStyles, "utf8"),
      /@import "@riebeckite\/honox\/style\.css";/,
    );
    assert.match(
      await readFile(pluginStyles, "utf8"),
      /@import "@riebeckite\/plugin-navigation\/style\.css";/,
    );
    assert.match(
      await readFile(themeStyles, "utf8"),
      /@import "@riebeckite\/theme-default\/style\.css";/,
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
