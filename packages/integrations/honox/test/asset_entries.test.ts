import assert from "node:assert/strict";
import { mkdtemp, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { writeRiebeckiteAssetEntries } from "../src/asset_entries.js";

test("asset entries are not rewritten when their contents are unchanged", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "riebeckite-assets-"));
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
    writeRiebeckiteAssetEntries(config, { pluginStyles, themeStyles });
    const timestamp = new Date("2020-01-01T00:00:00.000Z");
    await Promise.all([
      utimes(pluginStyles, timestamp, timestamp),
      utimes(themeStyles, timestamp, timestamp),
    ]);

    writeRiebeckiteAssetEntries(config, { pluginStyles, themeStyles });

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
