import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { test } from "node:test";

const workflows = new URL("../../../.github/workflows/", import.meta.url);

test("deploy.yml routes every deploy through the shared gate", async () => {
  const workflow = await fs.readFile(new URL("deploy.yml", workflows), "utf8");
  assert.match(workflow, /group: riebeckite-production/u);
  assert.match(workflow, /Verify latest revision/u);
  assert.match(workflow, /publish gate --provider cloudflare-workers/u);
  assert.ok(
    workflow.indexOf("Publication gate") <
      workflow.indexOf("Deploy the built assets"),
    "the gate must run before the deploy step",
  );
  assert.match(workflow, /Persist publication state/u);
  assert.match(workflow, /git add publication\/state\.json/u);
  assert.doesNotMatch(workflow, /apps\/web\/publication\/state\.json/u);
  assert.match(workflow, /\[skip ci\]/u);
  assert.match(workflow, /The branch advanced/u);
});

test("publish.yml shares the concurrency group and records durable state", async () => {
  const workflow = await fs.readFile(new URL("publish.yml", workflows), "utf8");
  assert.match(workflow, /group: riebeckite-production/u);
  assert.match(workflow, /cancel-in-progress: false/u);
  assert.match(workflow, /Verify latest revision/u);
  assert.match(workflow, /publish gate --provider cloudflare-workers/u);
  assert.match(workflow, /publish record/u);
  assert.match(workflow, /publication\/state\.json/u);
  assert.match(workflow, /git add publication\/state\.json/u);
  assert.doesNotMatch(workflow, /apps\/web\/publication\/state\.json/u);
  assert.match(workflow, /\[skip ci\]/u);
  assert.match(workflow, /The branch advanced/u);
  assert.ok(
    workflow.indexOf("Publication gate") <
      workflow.indexOf("Deploy the built assets"),
  );
});
