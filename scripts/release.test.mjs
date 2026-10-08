import assert from "node:assert/strict";
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
  failView = [],
  invalidView = [],
  failPublish = [],
  authFailPublish = [],
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
    failView: new Set(failView),
    invalidView: new Set(invalidView),
    failPublish: new Set(failPublish),
    authFailPublish: new Set(authFailPublish),
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
        if (state.failView.has(name)) {
          return { status: 1, stdout: "", stderr: "npm error network timeout" };
        }
        if (state.invalidView.has(name)) {
          return ok("not json");
        }
        const result = state.registry.has(name)
          ? ok(`${JSON.stringify(VERSION)}\n`)
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
      return recordPublish(readManifestName(cwd));
    }

    throw new Error(`unexpected command: ${command} ${args.join(" ")}`);
  };

  const spawnInteractive = async (command, args, cwd) => {
    state.interactiveCalls.push({ command, args, cwd });

    if (command === "npm" && args[0] === "login") {
      return ok("");
    }

    if (command === "pnpm" && args[0] === "publish") {
      return recordPublish(readManifestName(cwd));
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

test("fresh release publishes directly, verifies 81/81, then commits and tags", async () => {
  const harness = createHarness();

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(interactivePublishCalls(harness.state).length, 1);
  assert.equal(publishCalls(harness.state).length, ALL_PACKAGES.length - 1);
  assert.equal(harness.state.published.size, ALL_PACKAGES.length);
  assert.ok(stepLabels(harness.state).includes("git commit"));
  assert.ok(stepLabels(harness.state).includes("git tag"));
  assert.ok(
    output.some((line) =>
      line.includes(`✓ ${ALL_PACKAGES.length}/${ALL_PACKAGES.length}`),
    ),
  );
  assert.ok(
    output.some((line) => line.includes("Release publication verified")),
  );
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
  assert.ok(output.some((line) => line.includes("40/81 package(s) already")));
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

test("no staged npm commands are invoked and none remain in the source", async () => {
  const harness = createHarness();

  await withHarness(harness, () => runRelease([VERSION]));

  const invocations = [
    ...harness.state.calls,
    ...harness.state.interactiveCalls,
  ];
  assert.ok(invocations.length > 0);
  assert.equal(
    invocations.some((call) => JSON.stringify(call.args).includes("stage")),
    false,
  );

  const source = fs.readFileSync(
    path.join(repositoryRoot, "scripts", "release.mjs"),
    "utf8",
  );
  for (const needle of [
    "npm stage",
    "stage publish",
    "stage approve",
    "stage list",
    "--stage-only",
    "--cli-approval",
    "promptOtp",
  ]) {
    assert.equal(source.includes(needle), false, `unexpected ${needle}`);
  }
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
});
