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
  assert.match(workflow, /publish run/u);
  assert.match(
    workflow,
    /--execute --provider cloudflare-workers --trigger ci/u,
  );
  assert.doesNotMatch(workflow, /apps\/web\/publication\/state\.json/u);
  assert.match(workflow, /Restore incremental site build cache/u);
  assert.match(workflow, /Restore package build cache/u);
  await assert.rejects(
    fs.stat(new URL("deploy.yml", workflows)),
    "the separate deploy workflow must not exist",
  );
});

test("publish.yml stores publication state on a dedicated branch", async () => {
  const workflow = await fs.readFile(new URL("publish.yml", workflows), "utf8");
  assert.match(workflow, /PUBLICATION_STATE_BRANCH: publication-state/u);
  assert.match(workflow, /RIEBECKITE_PUBLICATION_STATE/u);
  assert.match(workflow, /Restore publication state/u);
  assert.match(workflow, /Persist publication state/u);
  assert.match(workflow, /refs\/heads\/\$PUBLICATION_STATE_BRANCH/u);
  assert.match(workflow, /git push origin "\$commit:refs\/heads\//u);
  assert.doesNotMatch(workflow, /git add publication\/state\.json/u);
  assert.doesNotMatch(workflow, /git commit -m/u);
  assert.doesNotMatch(workflow, /\[skip ci\]/u);
  assert.ok(
    workflow.indexOf("Restore publication state") <
      workflow.indexOf("Publish the documentation site"),
  );
  assert.ok(
    workflow.indexOf("Publish the documentation site") <
      workflow.indexOf("Persist publication state"),
  );
});
