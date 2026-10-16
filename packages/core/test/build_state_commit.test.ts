import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import {
  contentTestConfig,
  memoryContentSource,
} from "./support/content_fixture.js";

const files = {
  "a.md": "---\ntitle: A\nvisibility: public\n---\n# A",
};

async function statePathAfterDecision(
  commitBuildState: boolean | undefined,
): Promise<string> {
  const directory = await fsp.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-commit-"),
  );
  const config = contentTestConfig(directory);
  const manager = new ContentManager(memoryContentSource(files), [], {
    config,
    plugins: config.plugins,
    commitBuildState,
  });
  await manager.getOutputChangeSet({ incremental: true });
  await manager.dispose();
  return path.join(directory, "build", "content-state.json");
}

test("a decision-only content manager does not persist build state", async () => {
  const statePath = await statePathAfterDecision(false);
  assert.equal(
    fs.existsSync(statePath),
    false,
    "commitBuildState: false must not write content-state.json before the builder runs",
  );
});

test("a content manager persists build state by default", async () => {
  const statePath = await statePathAfterDecision(undefined);
  assert.equal(
    fs.existsSync(statePath),
    true,
    "the default decision path must write content-state.json",
  );
});
