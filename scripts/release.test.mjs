import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";
import {
  parseArguments,
  ReleaseError,
  runRelease,
  runtime,
} from "./release.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

const ALL_PACKAGES = PACKAGE_DIRECTORIES.map(
  (directory) =>
    JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, directory, "package.json"),
        "utf8",
      ),
    ).name,
);

const VERSION = "9.9.9";

function ok(stdout = "") {
  return { status: 0, stdout, stderr: "" };
}

function readManifestName(directory) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, "package.json"), "utf8"),
  ).name;
}

function internalEdges() {
  const names = new Set(ALL_PACKAGES);
  const edges = [];

  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, directory, "package.json"),
        "utf8",
      ),
    );

    for (const section of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
    ]) {
      for (const dependencyName of Object.keys(manifest[section] ?? {})) {
        if (names.has(dependencyName)) {
          edges.push([dependencyName, manifest.name]);
        }
      }
    }
  }

  return edges;
}

function createHarness({
  published = [],
  publishedAfterInitialInspection = [],
  arrayView = [],
  failView = [],
  failViewAfterPublish = [],
  invalidView = [],
  failPublish = [],
  authFailPublish = [],
  permissionFailPublish = [],
  notFoundFailPublish = [],
  versionConflictPublish = [],
  transientFailPublish = {},
  timeoutPublish = [],
  markPublishedOnTimeout = [],
  tagExists = false,
  hasStagedChanges = true,
  interactive = true,
  propagation = 0,
} = {}) {
  const state = {
    version: VERSION,
    published: new Set(published),
    registry: new Set(published),
    publishedAfterInitialInspection: new Set(publishedAfterInitialInspection),
    arrayView: new Set(arrayView),
    failView: new Set(failView),
    failViewAfterPublish: new Set(failViewAfterPublish),
    invalidView: new Set(invalidView),
    failPublish: new Set(failPublish),
    authFailPublish: new Set(authFailPublish),
    permissionFailPublish: new Set(permissionFailPublish),
    notFoundFailPublish: new Set(notFoundFailPublish),
    versionConflictPublish: new Set(versionConflictPublish),
    transientFailPublish: new Map(Object.entries(transientFailPublish)),
    timeoutPublish: new Set(timeoutPublish),
    markPublishedOnTimeout: new Set(markPublishedOnTimeout),
    tagExists,
    hasStagedChanges,
    interactive,
    propagation,
    now: 0,
    calls: [],
    interactiveCalls: [],
    steps: [],
    publishOrder: [],
    sleeps: [],
    initialInspectionComplete: false,
    viewCount: 0,
  };

  const recordPublish = (name) => {
    state.publishOrder.push(name);

    if (state.failPublish.has(name)) {
      return { status: 1, stdout: "", stderr: "npm error code E500 broken" };
    }

    if (state.authFailPublish.has(name)) {
      return {
        status: 1,
        stdout: "",
        stderr: "npm error code ENEEDAUTH requires additional authentication",
      };
    }

    if (state.permissionFailPublish.has(name)) {
      return {
        status: 1,
        stdout: "",
        stderr:
          "npm error code E403 Forbidden - PUT https://registry.npmjs.org - " +
          "You do not have permission to publish this package.",
      };
    }

    if (state.notFoundFailPublish.has(name)) {
      return {
        status: 1,
        stdout: "",
        stderr:
          "npm error code E404 Not Found - PUT https://registry.npmjs.org",
      };
    }

    if (state.versionConflictPublish.has(name)) {
      return {
        status: 1,
        stdout: "",
        stderr: `npm error code E409 Conflict - version "${VERSION}" already exists.`,
      };
    }

    const transientRemaining = state.transientFailPublish.get(name) ?? 0;

    if (transientRemaining > 0) {
      state.transientFailPublish.set(name, transientRemaining - 1);

      return { status: 1, stdout: "", stderr: "npm error network timeout" };
    }

    state.published.add(name);

    if (state.propagation === 0) {
      state.registry.add(name);
    }

    return ok("");
  };

  const spawnBuffered = async (command, args, cwd) => {
    state.calls.push({ command, args, cwd });

    if (command === "npm") {
      if (args[0] === "whoami") {
        return ok("tester\n");
      }
      if (args[0] === "login") {
        return ok("");
      }
      if (args[0] === "view") {
        const spec = args[1];
        const name = spec.slice(0, spec.lastIndexOf("@"));
        const isInitialInspection = !state.initialInspectionComplete;
        if (isInitialInspection) {
          state.viewCount += 1;
        }
        if (
          state.failView.has(name) ||
          (state.publishOrder.includes(name) &&
            state.failViewAfterPublish.has(name))
        ) {
          return { status: 1, stdout: "", stderr: "npm error network timeout" };
        }
        if (state.invalidView.has(name)) {
          return ok("not json");
        }
        const result = state.registry.has(name)
          ? ok(
              `${JSON.stringify(
                state.arrayView.has(name) ? [VERSION] : VERSION,
              )}\n`,
            )
          : {
              status: 1,
              stdout: "",
              stderr:
                "npm error 404 Not Found - GET https://registry.npmjs.org",
            };
        if (isInitialInspection && state.viewCount === ALL_PACKAGES.length) {
          state.initialInspectionComplete = true;
          for (const publishedName of state.publishedAfterInitialInspection) {
            state.registry.add(publishedName);
          }
        }
        return result;
      }
    }

    if (command === "pnpm" && args[0] === "publish") {
      const name = readManifestName(cwd);

      if (state.timeoutPublish.has(name)) {
        state.publishOrder.push(name);

        if (state.markPublishedOnTimeout.has(name)) {
          state.published.add(name);

          if (state.propagation === 0) {
            state.registry.add(name);
          }
        }

        throw new ReleaseError(
          `publish ${name}@${VERSION} timed out after 600s.`,
        );
      }

      return recordPublish(name);
    }

    throw new Error(`unexpected command: ${command} ${args.join(" ")}`);
  };

  const spawnInteractive = async (command, args, cwd) => {
    state.interactiveCalls.push({ command, args, cwd });

    if (command === "npm" && args[0] === "login") {
      return ok("");
    }

    if (command === "pnpm" && args[0] === "publish") {
      const name = readManifestName(cwd);

      if (state.timeoutPublish.has(name)) {
        state.publishOrder.push(name);

        return { status: 1 };
      }

      return recordPublish(name);
    }

    throw new Error(
      `unexpected interactive command: ${command} ${args.join(" ")}`,
    );
  };

  const spawnSync = (command, args) => {
    state.calls.push({ command, args });

    if (command === "git" && args[0] === "rev-parse") {
      return { status: state.tagExists ? 0 : 1, stdout: "", stderr: "" };
    }
    if (command === "git" && args[0] === "diff") {
      return { status: state.hasStagedChanges ? 1 : 0, stdout: "", stderr: "" };
    }

    throw new Error(`unexpected sync command: ${command} ${args.join(" ")}`);
  };

  const runStep = (label, command, args) => {
    state.steps.push({ label, command, args });
  };

  const sleep = async (milliseconds) => {
    state.sleeps.push(milliseconds);
    state.now += milliseconds;

    if (state.propagation > 0 && Number.isFinite(state.propagation)) {
      state.propagation -= 1;

      if (state.propagation === 0) {
        state.registry = new Set(state.published);
      }
    }
  };

  return {
    state,
    runtime: {
      spawnBuffered,
      spawnInteractive,
      runStep,
      spawnSync,
      isInteractive: () => state.interactive,
      sleep,
      now: () => state.now,
    },
  };
}

async function withHarness(harness, run) {
  const saved = {
    spawnBuffered: runtime.spawnBuffered,
    spawnInteractive: runtime.spawnInteractive,
    runStep: runtime.runStep,
    spawnSync: runtime.spawnSync,
    isInteractive: runtime.isInteractive,
    sleep: runtime.sleep,
    now: runtime.now,
  };

  Object.assign(runtime, harness.runtime);

  const output = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  console.log = (...args) => output.push(args.join(" "));
  console.error = (...args) => output.push(args.join(" "));
  process.stdout.write = (chunk) => {
    output.push(String(chunk));
    return true;
  };
  process.stderr.write = (chunk) => {
    output.push(String(chunk));
    return true;
  };

  try {
    const result = await run();
    return { result, output };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    Object.assign(runtime, saved);
  }
}

function publishCalls(state) {
  return state.calls.filter(
    (call) => call.command === "pnpm" && call.args[0] === "publish",
  );
}

function interactivePublishCalls(state) {
  return state.interactiveCalls.filter(
    (call) => call.command === "pnpm" && call.args[0] === "publish",
  );
}

function publishAttemptsFor(state, name) {
  return [...publishCalls(state), ...interactivePublishCalls(state)].filter(
    (call) => readManifestName(call.cwd) === name,
  ).length;
}

function stepLabels(state) {
  return state.steps.map((step) => step.label);
}

test("parseArguments accepts only the direct-publish options", () => {
  assert.equal(parseArguments(["1.2.3"]).version, "1.2.3");
  assert.equal(parseArguments(["1.2.3", "--dry-run"]).dryRun, true);
  assert.equal(parseArguments(["--check-only"]).checkOnly, true);
  assert.equal(parseArguments(["--help"]).help, true);

  assert.throws(() => parseArguments(["1.2.3", "--nope"]), ReleaseError);
  assert.throws(() => parseArguments(["1.2.3", "--stage-only"]), ReleaseError);
  assert.throws(
    () => parseArguments(["1.2.3", "--cli-approval"]),
    ReleaseError,
  );
  assert.throws(
    () => parseArguments(["1.2.3", "--otp", "123456"]),
    ReleaseError,
  );
});

test("fresh release publishes directly, verifies every package, then commits and tags", async () => {
  const harness = createHarness();

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(interactivePublishCalls(harness.state).length, 1);
  assert.equal(publishCalls(harness.state).length, ALL_PACKAGES.length - 1);
  assert.equal(harness.state.published.size, ALL_PACKAGES.length);
  assert.ok(stepLabels(harness.state).includes("git commit"));
  assert.ok(stepLabels(harness.state).includes("git tag"));
  assert.ok(
    output.some((line) =>
      line.includes(`${ALL_PACKAGES.length}/${ALL_PACKAGES.length} published`),
    ),
  );
  assert.ok(
    output.some((line) => line.includes("✓ Release publication verified")),
  );
  assert.ok(output.some((line) => line.includes("RELEASE COMPLETE")));
});

test("release regenerates the scaffold golden snapshots before committing", async () => {
  const harness = createHarness();

  await withHarness(harness, () => runRelease([VERSION]));

  const goldenStep = harness.state.steps.find(
    (step) => step.label === "scaffold golden update",
  );
  assert.ok(goldenStep, "scaffold golden update step must run");
  assert.equal(goldenStep.command, "pnpm");
  assert.deepEqual(goldenStep.args, [
    "--filter",
    "create-riebeckite",
    "run",
    "test:golden",
  ]);

  const goldenDirectory = path.join(
    "packages",
    "create-riebeckite",
    "test",
    "__golden__",
    "scaffold",
  );
  const addStep = harness.state.steps.find((step) => step.label === "git add");
  assert.ok(addStep, "git add step must run");
  assert.ok(
    addStep.args.includes(goldenDirectory),
    "git add must stage the scaffold golden directory",
  );
  const commitStep = harness.state.steps.find(
    (step) => step.label === "git commit",
  );
  assert.ok(commitStep, "git commit step must run");
  assert.ok(
    commitStep.args.includes(goldenDirectory),
    "git commit must include the scaffold golden directory",
  );
});

test("dry-run does not regenerate or stage the scaffold golden snapshots", async () => {
  const harness = createHarness();

  await withHarness(harness, () => runRelease([VERSION, "--dry-run"]));

  assert.equal(
    stepLabels(harness.state).includes("scaffold golden update"),
    false,
  );
  assert.equal(stepLabels(harness.state).includes("git add"), false);
  assert.equal(stepLabels(harness.state).includes("git commit"), false);
});

test("already published packages are skipped", async () => {
  const harness = createHarness({ published: ALL_PACKAGES });

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(publishCalls(harness.state).length, 0);
  assert.equal(interactivePublishCalls(harness.state).length, 0);
  assert.ok(stepLabels(harness.state).includes("git tag"));
  assert.ok(
    output.some((line) =>
      line.includes(`${ALL_PACKAGES.length}/${ALL_PACKAGES.length}`),
    ),
  );
});

test("array-shaped npm view responses mark packages as published", async () => {
  const harness = createHarness({
    published: ALL_PACKAGES,
    arrayView: ALL_PACKAGES,
  });

  await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(publishCalls(harness.state).length, 0);
  assert.equal(interactivePublishCalls(harness.state).length, 0);
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("re-running the same release never republishes anything", async () => {
  const harness = createHarness();

  await withHarness(harness, () => runRelease([VERSION]));
  const firstRunPublishes = publishCalls(harness.state).length;

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(publishCalls(harness.state).length, firstRunPublishes);
  assert.equal(interactivePublishCalls(harness.state).length, 1);
  assert.ok(output.some((line) => line.includes("already published")));
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("versions published after inspection are skipped before interactive and parallel publish", async () => {
  const targets = ALL_PACKAGES.slice(0, 2);
  const harness = createHarness({
    published: ALL_PACKAGES.filter((name) => !targets.includes(name)),
    publishedAfterInitialInspection: targets,
  });

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(interactivePublishCalls(harness.state).length, 0);
  assert.equal(publishCalls(harness.state).length, 0);
  assert.deepEqual(harness.state.publishOrder, []);
  for (const name of targets) {
    assert.ok(
      output.some((line) => line.includes(`skip ${name}@${VERSION}`)),
      `${name} should be skipped after its publish-time registry check`,
    );
  }
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("partial release resumes from the already published packages", async () => {
  const preset = ALL_PACKAGES.slice(0, 40);
  const harness = createHarness({ published: preset });

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(interactivePublishCalls(harness.state).length, 1);
  assert.equal(publishCalls(harness.state).length, ALL_PACKAGES.length - 41);
  for (const name of preset) {
    assert.equal(harness.state.publishOrder.includes(name), false);
  }
  assert.equal(harness.state.published.size, ALL_PACKAGES.length);
  assert.ok(
    output.some((line) =>
      line.includes(`40/${ALL_PACKAGES.length} package(s) already`),
    ),
  );
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("dependency layers are published in dependency order", async () => {
  const harness = createHarness();

  await withHarness(harness, () => runRelease([VERSION]));

  const index = new Map(
    harness.state.publishOrder.map((name, position) => [name, position]),
  );

  const edges = internalEdges();
  assert.ok(edges.length > 0);

  for (const [dependency, dependent] of edges) {
    assert.ok(
      index.get(dependency) < index.get(dependent),
      `${dependency} must be published before ${dependent}`,
    );
  }
});

test("publish failure fails closed without commit or tag", async () => {
  const harness = createHarness({ failPublish: [ALL_PACKAGES[0]] });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("authentication failure fails closed without commit or tag", async () => {
  const harness = createHarness({ authFailPublish: [ALL_PACKAGES[10]] });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("registry inspection failure fails closed before publishing", async () => {
  const harness = createHarness({ failView: [ALL_PACKAGES[0]] });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(publishCalls(harness.state).length, 0);
  assert.equal(interactivePublishCalls(harness.state).length, 0);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("inconclusive successful registry response fails closed before publishing", async () => {
  const harness = createHarness({ invalidView: [ALL_PACKAGES[0]] });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(publishCalls(harness.state).length, 0);
  assert.equal(interactivePublishCalls(harness.state).length, 0);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("final verification partial does not create a commit or tag", async () => {
  const harness = createHarness({ propagation: Number.POSITIVE_INFINITY });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("propagation lag is retried and eventually commits and tags", async () => {
  const harness = createHarness({ propagation: 2 });

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.ok(harness.state.sleeps.length >= 2);
  assert.ok(stepLabels(harness.state).includes("git commit"));
  assert.ok(stepLabels(harness.state).includes("git tag"));
  assert.ok(
    output.some((line) => line.includes("waiting for registry propagation")),
  );
});

test("final verification tolerates registry propagation longer than one minute", async () => {
  const harness = createHarness({ propagation: 13 });

  await withHarness(harness, () => runRelease([VERSION]));

  assert.ok(harness.state.sleeps.length >= 13);
  assert.ok(stepLabels(harness.state).includes("git commit"));
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("propagation timeout fails closed without commit or tag", async () => {
  const harness = createHarness({ propagation: Number.POSITIVE_INFINITY });

  const { output } = await withHarness(harness, () =>
    runRelease([VERSION]).catch((error) => {
      assert.ok(error instanceof ReleaseError);
      assert.ok(error.message.includes("Final verification timed out"));
      return error;
    }),
  );

  assert.ok(harness.state.sleeps.length > 1);
  assert.ok(
    output.some((line) => line.includes("waiting for registry propagation")),
  );
  assert.ok(output.some((line) => line.includes("Unverified packages")));
  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("existing tag aborts before any publish", async () => {
  const harness = createHarness({ tagExists: true });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(publishCalls(harness.state).length, 0);
  assert.equal(interactivePublishCalls(harness.state).length, 0);
  assert.equal(harness.state.steps.length, 0);
});

test("a permission error is reported distinctly and fails closed", async () => {
  const target = ALL_PACKAGES.at(-1);
  const harness = createHarness({ permissionFailPublish: [target] });

  const { output } = await withHarness(harness, () =>
    runRelease([VERSION]).catch((error) => {
      assert.ok(error instanceof ReleaseError);
      return error;
    }),
  );

  assert.equal(publishAttemptsFor(harness.state, target), 1);
  assert.ok(output.some((line) => line.includes("[permission]")));
  assert.ok(
    output.some((line) =>
      line.includes("permission error, not a missing sign-in"),
    ),
  );
  assert.equal(
    interactivePublishCalls(harness.state).some(
      (call) => readManifestName(call.cwd) === target,
    ),
    false,
  );
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("an E404 response is a distinct failure that does not republish", async () => {
  const target = ALL_PACKAGES.at(-1);
  const harness = createHarness({ notFoundFailPublish: [target] });

  const { output } = await withHarness(harness, () =>
    runRelease([VERSION]).catch((error) => {
      assert.ok(error instanceof ReleaseError);
      return error;
    }),
  );

  assert.equal(publishAttemptsFor(harness.state, target), 1);
  assert.ok(output.some((line) => line.includes("[not-found]")));
  assert.ok(
    output.some((line) =>
      line.includes("reported this package spec as not found"),
    ),
  );
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("a version conflict stops after confirming the version is still unpublished", async () => {
  const target = ALL_PACKAGES.at(-1);
  const harness = createHarness({ versionConflictPublish: [target] });

  const { output } = await withHarness(harness, () =>
    runRelease([VERSION]).catch((error) => {
      assert.ok(error instanceof ReleaseError);
      return error;
    }),
  );

  assert.equal(publishAttemptsFor(harness.state, target), 1);
  assert.ok(output.some((line) => line.includes("[version-conflict]")));
  assert.ok(
    output.some((line) => line.includes("registry rejected this version")),
  );
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("transient publish failures are retried a bounded number of times", async () => {
  const target = ALL_PACKAGES.at(-1);
  const harness = createHarness({ transientFailPublish: { [target]: 2 } });

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(publishAttemptsFor(harness.state, target), 3);
  assert.ok(harness.state.sleeps.includes(5000));
  assert.ok(output.some((line) => line.includes("transient failure")));
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("transient publish failures stop after the retry budget", async () => {
  const target = ALL_PACKAGES.at(-1);
  const harness = createHarness({ transientFailPublish: { [target]: 5 } });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(publishAttemptsFor(harness.state, target), 3);
  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("a publish timeout re-checks the registry and accepts an accepted publish", async () => {
  const target = ALL_PACKAGES.at(-1);
  const harness = createHarness({
    timeoutPublish: [target],
    markPublishedOnTimeout: [target],
  });

  await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(publishAttemptsFor(harness.state, target), 1);
  assert.equal(harness.state.published.size, ALL_PACKAGES.length);
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("a lost publish response with an unavailable registry stops without retrying", async () => {
  const target = ALL_PACKAGES.at(-1);
  const harness = createHarness({
    timeoutPublish: [target],
    failViewAfterPublish: [target],
  });

  const { output } = await withHarness(harness, async () => {
    await assert.rejects(
      () => runRelease([VERSION]),
      (error) => {
        assert.ok(error instanceof ReleaseError);
        assert.ok(error.message.includes("failed in publish layer"));
        return true;
      },
    );
  });

  assert.equal(publishAttemptsFor(harness.state, target), 1);
  assert.ok(
    output.some((line) =>
      line.includes("published state could not be confirmed"),
    ),
  );
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("version bump dry-run is idempotent and never rewrites manifests", () => {
  const manifestPath = path.join(
    repositoryRoot,
    "packages",
    "core",
    "package.json",
  );
  const before = fs.readFileSync(manifestPath, "utf8");
  const version = JSON.parse(before).version;

  const runBump = () =>
    execFileSync(
      process.execPath,
      ["scripts/bump_version.mjs", version, "--dry-run"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );

  const first = runBump();
  const second = runBump();

  assert.equal(first, second);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), before);
});

test("tests never spawn a real npm/pnpm process or mutate the registry", async () => {
  const harness = createHarness();

  await withHarness(harness, () => runRelease([VERSION]));

  for (const call of harness.state.calls) {
    if (call.command === "npm") {
      assert.ok(
        ["view", "whoami"].includes(call.args[0]),
        `unexpected npm command ${call.args[0]}`,
      );
    } else if (call.command === "pnpm") {
      assert.equal(call.args[0], "publish");
    } else {
      assert.equal(call.command, "git");
    }
  }

  const source = fs.readFileSync(
    path.join(repositoryRoot, "scripts", "release.mjs"),
    "utf8",
  );
  assert.equal(source.includes('"stage"'), false);
  assert.equal(source.includes("npm stage"), false);
});
