import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { test } from "node:test";

const workflows = new URL("../../../.github/workflows/", import.meta.url);

test("publish.yml is the single production deploy path", async () => {
  const workflow = await fs.readFile(new URL("publish.yml", workflows), "utf8");
  assert.match(workflow, /group: riebeckite-production/u);
  assert.match(workflow, /cancel-in-progress: false/u);
  assert.match(workflow, /Verify latest revision/u);
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/u);
  assert.match(workflow, /publish gate --provider cloudflare-workers/u);
  assert.match(workflow, /publish record/u);
  assert.match(workflow, /git add publication\/state\.json/u);
  assert.doesNotMatch(workflow, /apps\/web\/publication\/state\.json/u);
  assert.match(workflow, /\[skip ci\]/u);
  assert.match(workflow, /The branch advanced/u);
  assert.ok(
    workflow.indexOf("Publication gate") <
      workflow.indexOf("Deploy the built assets"),
  );
  await assert.rejects(
    fs.stat(new URL("deploy.yml", workflows)),
    "the separate deploy workflow must not exist",
  );
});
