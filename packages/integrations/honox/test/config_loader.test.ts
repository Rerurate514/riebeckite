import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadRiebeckiteConfig } from "../src/config_loader.js";

test("loads a config from a directory without workspace package links", async () => {
  const configRoot = await mkdtemp(path.join(tmpdir(), "riebeckite-config-"));
  try {
    await writeFile(
      path.join(configRoot, "riebeckite.config.ts"),
      'export default { site: { title: "External config" } };\n',
      "utf8",
    );

    const config = await loadRiebeckiteConfig({
      configRoot,
      workspaceRoot: path.resolve(import.meta.dirname, "../../../.."),
    });

    assert.equal(config.site.title, "External config");
  } finally {
    await rm(configRoot, { recursive: true, force: true });
  }
});
