import path from "node:path";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";
import { ARTIFACT_LEDGER_PATH } from "./release_artifacts.mjs";
import {
  ReleaseError,
  repositoryRoot,
  scaffoldGoldenDirectory,
  scaffoldVersionFile,
  VERIFY_INTERVAL_MS,
  VERIFY_TIMEOUT_MS,
} from "./release_core.mjs";
import { runtime } from "./release_process.mjs";
import { inspectPublishedPackages } from "./release_registry.mjs";

export async function verifyPublishedPackages(manifests, version) {
  const total = PACKAGE_DIRECTORIES.length;
  const deadline = runtime.now() + VERIFY_TIMEOUT_MS;

  console.log(
    `\n[step] verifying published packages (timeout ${Math.round(
      VERIFY_TIMEOUT_MS / 1000,
    )}s)`,
  );

  while (true) {
    const published = await inspectPublishedPackages(
      manifests,
      version,
      false,
      true,
    );

    if (published.size === total) {
      console.log(`\n${published.size}/${total} published`);

      console.log("✓ Release publication verified");

      return published;
    }

    const missing = PACKAGE_DIRECTORIES.filter(
      (directory) => !published.has(directory),
    ).map((directory) => `${manifests.get(directory).name}@${version}`);

    if (runtime.now() >= deadline) {
      console.error("\nUnverified packages:");

      for (const spec of missing) {
        console.error(`  - ${spec}`);
      }

      throw new ReleaseError(
        `Final verification timed out: ${published.size}/${total} published, ` +
          `${missing.length} missing. Refusing to commit or tag. ` +
          "Re-run the release once the registry has propagated.",
      );
    }

    console.log(
      `\n${published.size}/${total} published; waiting for registry propagation...`,
    );

    await runtime.sleep(VERIFY_INTERVAL_MS);
  }
}

export function assertReleaseComplete(published, version) {
  const total = PACKAGE_DIRECTORIES.length;

  if (published.size !== total) {
    throw new ReleaseError(
      `Release is not complete: ${published.size}/${total} package versions ` +
        "published. Refusing to create a commit or tag.",
    );
  }

  console.log(
    `\nRELEASE COMPLETE: ${published.size}/${total} package versions published as ${version}.`,
  );
}

export function ensureTagDoesNotExist(version) {
  const result = runtime.spawnSync(
    "git",
    ["rev-parse", "-q", "--verify", `refs/tags/v${version}`],
    {
      cwd: repositoryRoot,
      stdio: "ignore",
    },
  );

  if (result.error) {
    throw new ReleaseError(
      `Could not inspect tag v${version}: ${result.error.message}`,
    );
  }

  if (result.status === 0) {
    throw new ReleaseError(`Tag v${version} already exists; aborting.`);
  }
}

export function hasStagedChanges(paths) {
  const result = runtime.spawnSync(
    "git",
    ["diff", "--cached", "--quiet", "--", ...paths],
    {
      cwd: repositoryRoot,
      stdio: "ignore",
    },
  );

  if (result.error) {
    throw new ReleaseError(
      `Could not inspect staged release changes: ${result.error.message}`,
    );
  }

  if (result.signal) {
    throw new ReleaseError(`git diff terminated by signal ${result.signal}.`);
  }

  if (result.status === 0) {
    return false;
  }

  if (result.status === 1) {
    return true;
  }

  throw new ReleaseError(
    `Could not inspect staged release changes; git diff exited with ${result.status}.`,
    result.status,
  );
}

export function commitAndTag(version) {
  const tagName = `v${version}`;

  const manifests = PACKAGE_DIRECTORIES.map((directory) =>
    path.join(directory, "package.json"),
  );

  const releaseFiles = [
    ...manifests,
    scaffoldVersionFile,
    scaffoldGoldenDirectory,
    "CHANGELOG.md",
    "changes",
    ARTIFACT_LEDGER_PATH,
    "docs/docs/releases.md",
    "docs/docs/releases.ja.md",
  ];

  runtime.runStep("git add", "git", ["add", "--", ...releaseFiles]);

  const createdCommit = hasStagedChanges(releaseFiles);

  if (createdCommit) {
    runtime.runStep("git commit", "git", [
      "commit",
      "-m",
      `release ${tagName}`,
      "--",
      ...releaseFiles,
    ]);
  } else {
    console.log("\n[step] git commit");

    console.log("No staged release changes; skipping commit.");
  }

  runtime.runStep("git tag", "git", ["tag", tagName]);

  if (createdCommit) {
    console.log(`\nCommitted and tagged ${tagName} locally (tag not pushed).`);
  } else {
    console.log(`\nTagged ${tagName} locally (tag not pushed).`);
  }
}

export function printPushInstructions(version) {
  console.log("\nPush the locally created commit and tag when ready:");

  console.log("  git push");

  console.log(`  git push origin v${version}`);
}
