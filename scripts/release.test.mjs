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

function createHarness({
  published = [],
  staged = [],
  failView = [],
  failApprove = false,
  tagExists = false,
  hasStagedChanges = true,
  interactive = true,
  promptScript = [],
} = {}) {
  const state = {
    version: VERSION,
    published: new Set(published),
    staged: new Map(),
    calls: [],
    steps: [],
    prompts: [],
    failView: new Set(failView),
    failApprove,
    tagExists,
    hasStagedChanges,
    interactive,
    promptScript: [...promptScript],
    tarballInfo: new Map(),
    stageCounter: 0,
  };

  for (const name of staged) {
    state.staged.set(name, {
      id: `preset-${name}`,
      packageName: name,
      version: VERSION,
    });
  }

  let promptIndex = 0;

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
        if (state.failView.has(name)) {
          return { status: 1, stdout: "", stderr: "npm error network timeout" };
        }
        if (state.published.has(name)) {
          return ok(`${VERSION}\n`);
        }
        return {
          status: 1,
          stdout: "",
          stderr: "npm error 404 Not Found - GET https://registry.npmjs.org",
        };
      }
      if (args[0] === "stage" && args[1] === "list") {
        return ok(JSON.stringify([...state.staged.values()]));
      }
      if (args[0] === "stage" && args[1] === "publish") {
        const info = state.tarballInfo.get(args[2]);
        if (!info) {
          return { status: 1, stdout: "", stderr: "unknown tarball" };
        }
        state.stageCounter += 1;
        const id = `stage-${state.stageCounter}`;
        state.staged.set(info.name, {
          id,
          packageName: info.name,
          version: VERSION,
        });
        return ok(JSON.stringify({ stageId: id }));
      }
      if (args[0] === "stage" && args[1] === "approve") {
        const entry = [...state.staged.values()].find(
          (candidate) => candidate.id === args[2],
        );
        if (state.failApprove || !entry) {
          return {
            status: 1,
            stdout: "",
            stderr: "npm error code EOTP one-time password required",
          };
        }
        state.published.add(entry.packageName);
        state.staged.delete(entry.packageName);
        return ok(JSON.stringify({ ok: true }));
      }
    }

    if (command === "pnpm" && args[0] === "pack") {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
      );
      const destination = args[args.indexOf("--pack-destination") + 1];
      const slug = manifest.name.replaceAll("@", "").replaceAll("/", "-");
      const tarball = path.join(destination, `${slug}-${VERSION}.tgz`);
      state.tarballInfo.set(tarball, { name: manifest.name });
      return ok(`${tarball}\n`);
    }

    throw new Error(`unexpected command: ${command} ${args.join(" ")}`);
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

  const promptLine = async (message) => {
    state.prompts.push(message);

    if (promptIndex >= state.promptScript.length) {
      throw new Error(`unexpected prompt: ${message}`);
    }

    const step = state.promptScript[promptIndex];
    promptIndex += 1;

    if (typeof step === "function") {
      return String(step() ?? "");
    }
    if (step && typeof step === "object") {
      if (step.effect) {
        step.effect();
      }
      return String(step.answer ?? "");
    }

    return String(step ?? "");
  };

  return {
    state,
    runtime: {
      spawnBuffered,
      spawnInteractive: async () => ok(""),
      runStep,
      spawnSync,
      promptLine,
      isInteractive: () => state.interactive,
    },
  };
}

async function withHarness(harness, run) {
  const saved = {
    spawnBuffered: runtime.spawnBuffered,
    spawnInteractive: runtime.spawnInteractive,
    runStep: runtime.runStep,
    spawnSync: runtime.spawnSync,
    promptLine: runtime.promptLine,
    isInteractive: runtime.isInteractive,
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

function stagePublishCalls(state) {
  return state.calls.filter(
    (call) =>
      call.command === "npm" &&
      call.args[0] === "stage" &&
      call.args[1] === "publish",
  );
}

function approveCalls(state) {
  return state.calls.filter(
    (call) =>
      call.command === "npm" &&
      call.args[0] === "stage" &&
      call.args[1] === "approve",
  );
}

function stepLabels(state) {
  return state.steps.map((step) => step.label);
}

function publishAll(staged, published) {
  return () => {
    for (const name of [...staged.keys()]) {
      published.add(name);
    }
    staged.clear();
  };
}

test("parseArguments preserves --otp compatibility and adds --cli-approval", () => {
  const otpOptions = parseArguments(["1.2.3", "--otp", "123456"]);
  assert.equal(otpOptions.otp, "123456");
  assert.equal(otpOptions.cliApproval, true);

  const cliOptions = parseArguments(["1.2.3", "--cli-approval"]);
  assert.equal(cliOptions.cliApproval, true);
  assert.equal(cliOptions.otp, null);

  const webOptions = parseArguments(["1.2.3"]);
  assert.equal(webOptions.cliApproval, false);

  assert.throws(() => parseArguments(["1.2.3", "--nope"]), ReleaseError);
  assert.throws(() => parseArguments(["1.2.3", "--otp"]), ReleaseError);
});

test("fresh release stages, waits for web approval, verifies, then finalizes", async () => {
  const harness = createHarness({
    promptScript: [
      {
        effect: () => {
          for (const name of [...harness.state.staged.keys()]) {
            harness.state.published.add(name);
          }
          harness.state.staged.clear();
        },
        answer: "",
      },
    ],
  });

  const { output } = await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(stagePublishCalls(harness.state).length, ALL_PACKAGES.length);
  assert.equal(approveCalls(harness.state).length, 0);
  assert.ok(stepLabels(harness.state).includes("git commit"));
  assert.ok(stepLabels(harness.state).includes("git tag"));
  assert.ok(
    output.some((line) =>
      line.includes(`✓ ${ALL_PACKAGES.length}/${ALL_PACKAGES.length}`),
    ),
  );
  assert.ok(output.some((line) => line.includes("security key")));
});

test("stage-only stages, verifies, prints web instructions, and does not tag", async () => {
  const harness = createHarness();

  const { output } = await withHarness(harness, () =>
    runRelease([VERSION, "--stage-only"]),
  );

  assert.equal(stagePublishCalls(harness.state).length, ALL_PACKAGES.length);
  assert.equal(approveCalls(harness.state).length, 0);
  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
  assert.ok(output.some((line) => line.includes("staged successfully")));
  assert.ok(output.some((line) => line.includes("npmjs.com")));
});

test("resume after stage-only reuses existing stages without duplicate staging", async () => {
  const harness = createHarness();

  await withHarness(harness, () => runRelease([VERSION, "--stage-only"]));
  const stagedOnce = stagePublishCalls(harness.state).length;
  assert.equal(stagedOnce, ALL_PACKAGES.length);

  harness.state.promptScript = [
    {
      effect: publishAll(harness.state.staged, harness.state.published),
      answer: "",
    },
  ];

  await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(stagePublishCalls(harness.state).length, stagedOnce);
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("interrupted staging resumes without re-staging already staged packages", async () => {
  const stagedPreset = ALL_PACKAGES.slice(0, 5);
  const harness = createHarness({ staged: stagedPreset });

  harness.state.promptScript = [
    {
      effect: publishAll(harness.state.staged, harness.state.published),
      answer: "",
    },
  ];

  await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(
    stagePublishCalls(harness.state).length,
    ALL_PACKAGES.length - stagedPreset.length,
  );
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("partial web approval does not finalize and fails closed", async () => {
  const harness = createHarness({
    promptScript: [
      {
        effect: () => {
          const names = [...harness.state.staged.keys()];
          for (const name of names.slice(0, Math.floor(names.length / 2))) {
            harness.state.published.add(name);
            harness.state.staged.delete(name);
          }
        },
        answer: "",
      },
      "abort",
    ],
  });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
  assert.equal(harness.state.published.size < ALL_PACKAGES.length, true);
});

test("already published packages are not staged or approved again", async () => {
  const harness = createHarness({ published: ALL_PACKAGES });

  await withHarness(harness, () => runRelease([VERSION]));

  assert.equal(stagePublishCalls(harness.state).length, 0);
  assert.equal(approveCalls(harness.state).length, 0);
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("CLI OTP approval publishes every staged package and does not leak the OTP", async () => {
  const harness = createHarness();
  const otp = "123456";

  const { output } = await withHarness(harness, () =>
    runRelease([VERSION, "--otp", otp]),
  );

  const approvals = approveCalls(harness.state);
  assert.equal(approvals.length, ALL_PACKAGES.length);
  for (const call of approvals) {
    assert.deepEqual(call.args.slice(-2), ["--otp", otp]);
  }
  assert.equal(output.join("\n").includes(otp), false);
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("--cli-approval prompts for a one-time password and never logs it", async () => {
  const harness = createHarness({
    promptScript: ["654321"],
  });
  const otp = "654321";

  const { output } = await withHarness(harness, () =>
    runRelease([VERSION, "--cli-approval"]),
  );

  assert.equal(approveCalls(harness.state).length, ALL_PACKAGES.length);
  assert.equal(output.join("\n").includes(otp), false);
  assert.ok(stepLabels(harness.state).includes("git tag"));
});

test("approval failure is a release failure and creates no tag", async () => {
  const harness = createHarness({ failApprove: true });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION, "--otp", "000000"])),
    ReleaseError,
  );

  assert.equal(stepLabels(harness.state).includes("git commit"), false);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("registry inspection failure fails closed before staging", async () => {
  const harness = createHarness({ failView: [ALL_PACKAGES[0]] });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(stagePublishCalls(harness.state).length, 0);
  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});

test("existing tag aborts before any staging", async () => {
  const harness = createHarness({ tagExists: true });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(stagePublishCalls(harness.state).length, 0);
});

test("non-interactive web approval fails closed instead of guessing", async () => {
  const harness = createHarness({ interactive: false });

  await assert.rejects(
    () => withHarness(harness, () => runRelease([VERSION])),
    ReleaseError,
  );

  assert.equal(stepLabels(harness.state).includes("git tag"), false);
});
