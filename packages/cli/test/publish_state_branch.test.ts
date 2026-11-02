import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const workflowUrl = new URL(
  "../../../.github/workflows/publish.yml",
  import.meta.url,
);

function extractRunStep(workflow: string, name: string): string {
  const lines = workflow.split("\n");
  const stepIndex = lines.findIndex(
    (line) => line.trim() === `- name: ${name}`,
  );
  assert.ok(stepIndex >= 0, `workflow must contain a step named ${name}`);
  const runIndex = lines.findIndex(
    (line, index) => index > stepIndex && line.trim() === "run: |",
  );
  assert.ok(runIndex > stepIndex, `${name} must use a literal run block`);
  const blockIndent = lines[runIndex].search(/\S/) + 2;
  const body: string[] = [];
  for (let index = runIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") {
      body.push("");
      continue;
    }
    if (line.search(/\S/) < blockIndent) break;
    body.push(line.slice(blockIndent));
  }
  return `${body.join("\n")}\n`;
}

function resolveBash(): string | undefined {
  if (process.platform !== "win32") return "bash";
  const candidate = "C:\\Program Files\\Git\\bin\\bash.exe";
  return fs.existsSync(candidate) ? candidate : undefined;
}

function bashPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function git(args: string[], cwd: string, input?: string): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", input });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("the persist step pushes publication state to a dedicated branch", async (t) => {
  const workflow = await fsp.readFile(workflowUrl, "utf8");
  assert.match(workflow, /inputs\.force/u);
  assert.match(workflow, /hash-object -w/u);
  assert.match(workflow, /mktree/u);
  assert.match(workflow, /commit-tree/u);
  assert.match(workflow, /git push origin "\$commit:refs\/heads\//u);

  const bash = resolveBash();
  if (bash === undefined) {
    t.skip("bash is not available on this platform");
    return;
  }
  const script = extractRunStep(workflow, "Persist publication state");
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "riebeckite-state-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "work");
  const stateFile = path.join(root, "state.json");
  git(["init", "--bare", remote], root);
  git(["init", "-b", "main", work], root);
  await fsp.writeFile(path.join(work, "README.md"), "site\n");
  git(["add", "README.md"], work);
  git(
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "initial",
    ],
    work,
  );
  git(["remote", "add", "origin", bashPath(remote)], work);
  git(["push", "-u", "origin", "main"], work);
  const sourceHead = git(["rev-parse", "HEAD"], work);

  const save = async (state: unknown, restoredSha: string) => {
    await fsp.writeFile(stateFile, `${JSON.stringify(state)}\n`);
    const result = spawnSync(bash, ["-c", script], {
      cwd: work,
      encoding: "utf8",
      env: {
        ...process.env,
        RIEBECKITE_PUBLICATION_STATE: bashPath(stateFile),
        PUBLICATION_STATE_BRANCH: "publication-state",
        PUBLICATION_STATE_SHA: restoredSha,
        GITHUB_REF_NAME: "main",
      },
    });
    return result;
  };
  const remoteState = () =>
    git(
      ["--git-dir", bashPath(remote), "show", "publication-state:state.json"],
      root,
    );
  const remoteSha = () =>
    git(
      ["--git-dir", bashPath(remote), "rev-parse", "publication-state"],
      root,
    );

  const first = await save({ version: 1, lastSuccess: { runId: "run-1" } }, "");
  assert.equal(first.status, 0, first.stderr);
  assert.match(remoteState(), /run-1/u);

  const firstSha = remoteSha();
  assert.equal(
    git(["--git-dir", bashPath(remote), "rev-list", "--count", firstSha], root),
    "1",
  );

  const second = await save(
    { version: 1, lastSuccess: { runId: "run-2" } },
    firstSha,
  );
  assert.equal(second.status, 0, second.stderr);
  assert.match(remoteState(), /run-2/u);
  const secondSha = remoteSha();
  assert.equal(
    git(["--git-dir", bashPath(remote), "rev-parse", `${secondSha}^`], root),
    firstSha,
    "the update must be a fast-forward from the restored state",
  );
  assert.equal(git(["rev-parse", "HEAD"], work), sourceHead);

  const otherBlob = git(
    ["--git-dir", bashPath(remote), "hash-object", "-w", "--stdin"],
    root,
    '{"version":1,"lastSuccess":{"runId":"run-3"}}\n',
  );
  const otherTree = git(
    ["--git-dir", bashPath(remote), "mktree"],
    root,
    `100644 blob ${otherBlob}\tstate.json\n`,
  );
  const otherCommit = git(
    [
      "--git-dir",
      bashPath(remote),
      "-c",
      "user.name=Other",
      "-c",
      "user.email=other@example.com",
      "commit-tree",
      otherTree,
      "-p",
      secondSha,
      "-m",
      "other run",
    ],
    root,
  );
  git(
    [
      "--git-dir",
      bashPath(remote),
      "update-ref",
      "refs/heads/publication-state",
      otherCommit,
    ],
    root,
  );

  const stale = await save(
    { version: 1, lastSuccess: { runId: "run-4" } },
    secondSha,
  );
  assert.notEqual(stale.status, 0);
  assert.match(`${stale.stderr}${stale.stdout}`, /branch moved/u);
  assert.match(
    remoteState(),
    /run-3/u,
    "a stale run must not overwrite newer state",
  );
  assert.equal(remoteSha(), otherCommit);
  assert.equal(git(["rev-parse", "HEAD"], work), sourceHead);
});
