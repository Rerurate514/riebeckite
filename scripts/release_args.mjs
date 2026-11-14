import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";
import { ARTIFACT_LEDGER_PATH } from "./release_artifacts.mjs";
import {
  computePublishLayers,
  finalizeChangeEntries,
  readPackageManifests,
  runChecks,
  validateChangeEntries,
} from "./release_checks.mjs";
import {
  ReleaseError,
  repositoryRoot,
  SEMVER_PATTERN,
  usage,
} from "./release_core.mjs";
import { runtime } from "./release_process.mjs";
import { publishPackages } from "./release_publish_layers.mjs";
import { inspectPublishedPackages } from "./release_registry.mjs";
import {
  assertReleaseComplete,
  commitAndTag,
  ensureTagDoesNotExist,
  printPushInstructions,
  verifyPublishedPackages,
} from "./release_verify.mjs";

export function parseArguments(rawArguments) {
  const options = {
    dryRun: false,
    checkOnly: false,
    help: false,
    version: null,
  };

  for (const argument of rawArguments) {
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--check-only") {
      options.checkOnly = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument.startsWith("-")) {
      throw new ReleaseError(`Unknown option: ${argument}`);
    } else if (options.version !== null) {
      throw new ReleaseError(`Unexpected extra argument: ${argument}`);
    } else {
      options.version = argument;
    }
  }

  return options;
}

export async function runRelease(rawArguments) {
  const options = parseArguments(rawArguments);

  if (options.help) {
    console.log(usage);

    return;
  }

  if (options.checkOnly) {
    runChecks();

    console.log("\ncheck-only: metadata and dependency checks passed.");

    return;
  }

  const { dryRun, version } = options;

  if (!version) {
    throw new ReleaseError(`Missing <version>.\n\n${usage}`);
  }

  if (!SEMVER_PATTERN.test(version)) {
    throw new ReleaseError(
      `Expected an exact semantic version, received ${JSON.stringify(
        version,
      )}.`,
    );
  }

  console.log(
    `\nRiebeckite release ${dryRun ? "(dry-run) " : ""}v${version} for ${
      PACKAGE_DIRECTORIES.length
    } public packages.`,
  );

  if (!dryRun) {
    ensureTagDoesNotExist(version);
  }

  const changes = validateChangeEntries();

  console.log(
    `\n[change entries] ${changes.unreleased.length} pending, ` +
      `${changes.releases.length} recorded release(s).`,
  );

  if (changes.unreleased.length === 0) {
    console.log(
      "[change entries] no user-facing changes are pending; " +
        "the release notes will record none.",
    );
  }

  const bumpArgs = ["scripts/bump_version.mjs", version];

  if (dryRun) {
    bumpArgs.push("--dry-run");
  }

  runtime.runStep("version bump", process.execPath, bumpArgs);

  runtime.runStep("build:packages", "pnpm", ["run", "build:packages"]);

  if (!dryRun) {
    runtime.runStep(
      "scaffold golden update",
      "pnpm",
      ["--filter", "create-riebeckite", "run", "test:golden"],
      repositoryRoot,
      { env: { ...process.env, UPDATE_GOLDEN: "1" } },
    );
  }

  runChecks();

  const artifactCoverage = runtime.checkArtifactCoverage({
    root: repositoryRoot,
    directories: PACKAGE_DIRECTORIES,
    entryPackages: changes.unreleased.flatMap((entry) => entry.packages),
  });

  console.log("\n[step] published artifact coverage");

  if (artifactCoverage.baseline) {
    console.log(
      `No ${ARTIFACT_LEDGER_PATH} yet; this release records the first baseline.`,
    );
  } else {
    for (const { name } of artifactCoverage.changed) {
      console.log(`  changed  ${name}`);
    }

    if (artifactCoverage.uncovered.length > 0) {
      const lines = artifactCoverage.uncovered.map(({ name }) => `  - ${name}`);

      if (dryRun) {
        console.log(
          `  [dry-run] changed packages with no change entry:\n${lines.join(
            "\n",
          )}`,
        );
      } else {
        throw new ReleaseError(
          "These packages publish different files but no pending change entry lists them:\n" +
            `${lines.join("\n")}\n` +
            "Add each package to a change entry before releasing.",
        );
      }
    }
  }

  const manifests = readPackageManifests();

  const published = await inspectPublishedPackages(
    manifests,
    version,
    dryRun,
    false,
  );

  if (!dryRun) {
    console.log(
      `\n${published.size}/${PACKAGE_DIRECTORIES.length} package(s) already ` +
        `published as ${version}.`,
    );
  }

  const publishLayers = computePublishLayers(manifests);

  await publishPackages(publishLayers, manifests, published, dryRun, version);

  if (dryRun) {
    console.log(
      "\nDry-run finished: no versions, tarballs, or git objects created.",
    );

    return;
  }

  const verified = await verifyPublishedPackages(manifests, version);

  assertReleaseComplete(verified, version);

  runtime.writeArtifactLedger(repositoryRoot, artifactCoverage.current);

  console.log(
    `[artifacts] recorded ${artifactCoverage.current.size} package hash(es) in ${ARTIFACT_LEDGER_PATH}.`,
  );

  const finalized = finalizeChangeEntries(version, runtime.today());

  console.log(
    `\n[changelog] archived ${finalized.moved} change entr${
      finalized.moved === 1 ? "y" : "ies"
    } for v${version}; ${finalized.entryCount} entr${
      finalized.entryCount === 1 ? "y" : "ies"
    } in the release notes.`,
  );

  commitAndTag(version);

  printPushInstructions(version);
}

export async function main(rawArguments = process.argv.slice(2)) {
  try {
    await runRelease(rawArguments);

    return 0;
  } catch (error) {
    if (error instanceof ReleaseError) {
      console.error(`\nrelease failed: ${error.message}`);

      process.exitCode = error.status;

      return error.status;
    }

    throw error;
  }
}
