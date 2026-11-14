import path from "node:path";
import { classifyPublishFailure } from "./release_classify.mjs";
import {
  PACKAGE_STATE,
  PUBLISH_ATTEMPTS,
  PUBLISH_FAILURE,
  PUBLISH_RETRY_DELAY_MS,
  PUBLISH_TIMEOUT_MS,
  PublishError,
  ReleaseError,
  repositoryRoot,
} from "./release_core.mjs";
import { runtime } from "./release_process.mjs";
import {
  isPackageVersionPublished,
  queryPublishedState,
} from "./release_registry.mjs";

export async function publishInteractive(directory, manifest, version, reason) {
  const packageSpec = `${manifest.name}@${version}`;

  if (await isPackageVersionPublished(manifest.name, version)) {
    console.log(`\n[publish] skip ${packageSpec} (already published)`);

    return;
  }

  console.log("\n[interactive publish]");

  if (reason) {
    console.log(reason);
  }

  console.log(`Publishing ${packageSpec} interactively.`);

  console.log("Complete npm authentication when prompted.");

  const result = await runtime.spawnInteractive(
    "pnpm",
    ["publish", "--no-git-checks"],
    path.join(repositoryRoot, directory),
    {
      timeout: PUBLISH_TIMEOUT_MS,
      label: `interactive publish ${packageSpec}`,
    },
  );

  if (result.status === 0) {
    console.log(`[interactive publish] finished ${packageSpec}`);

    return;
  }

  const published = await queryPublishedState(manifest.name, version);

  if (published.state === PACKAGE_STATE.PUBLISHED) {
    console.log(
      `[interactive publish] ${packageSpec} is published despite a failed ` +
        "response; treating it as complete.",
    );

    return;
  }

  if (published.state === PACKAGE_STATE.UNKNOWN) {
    throw new ReleaseError(
      `Interactive publish ${packageSpec} failed with exit code ${result.status}, ` +
        `and its published state could not be confirmed: ${
          published.reason ?? "unknown registry error"
        }. Refusing to publish again.`,
      result.status,
    );
  }

  throw new PublishError(
    `Interactive publish ${packageSpec} failed with exit code ${result.status}.`,
    {
      status: result.status,
      category: PUBLISH_FAILURE.UNKNOWN,
    },
  );
}

export async function publishPackage(
  directory,
  manifest,
  version,
  dryRun,
  position,
  total,
) {
  const packageSpec = `${manifest.name}@${version}`;

  if (await isPackageVersionPublished(manifest.name, version)) {
    console.log(
      `[publish ${position}/${total}] skip ${packageSpec} (already published)`,
    );

    return;
  }

  const args = ["publish", "--no-git-checks"];

  if (dryRun) {
    args.push("--dry-run");
  }

  for (let attempt = 1; attempt <= PUBLISH_ATTEMPTS; attempt += 1) {
    const suffix = attempt > 1 ? ` (attempt ${attempt})` : "";

    console.log(
      `[publish ${position}/${total}] starting ${packageSpec}${suffix}`,
    );

    let result = null;
    let failureMessage = null;

    try {
      result = await runtime.spawnBuffered(
        "pnpm",
        args,
        path.join(repositoryRoot, directory),
        {
          timeout: PUBLISH_TIMEOUT_MS,
          label: `publish ${packageSpec}`,
        },
      );
    } catch (error) {
      failureMessage = error.message;
    }

    if (result !== null) {
      console.log(`\n[publish ${position}/${total}] ${packageSpec}`);

      if (result.stdout.trim()) {
        process.stdout.write(`${result.stdout.trimEnd()}\n`);
      }

      if (result.stderr.trim()) {
        process.stderr.write(`${result.stderr.trimEnd()}\n`);
      }

      if (result.status === 0) {
        console.log(`[publish ${position}/${total}] finished ${packageSpec}`);

        return;
      }
    }

    const published = await queryPublishedState(manifest.name, version);

    if (published.state === PACKAGE_STATE.PUBLISHED) {
      console.log(
        `[publish ${position}/${total}] ${packageSpec} is published despite ` +
          "a failed response; treating it as complete.",
      );

      return;
    }

    if (published.state === PACKAGE_STATE.UNKNOWN) {
      throw new PublishError(
        `publish ${packageSpec} failed and its published state could not be confirmed: ${
          published.reason ?? "unknown registry error"
        }. Refusing to publish again.`,
        {
          status: result?.status ?? 1,
          stdout: result?.stdout ?? "",
          stderr: result?.stderr ?? "",
        },
      );
    }

    const category =
      result === null
        ? PUBLISH_FAILURE.TRANSIENT
        : classifyPublishFailure(result);

    if (category === PUBLISH_FAILURE.TRANSIENT && attempt < PUBLISH_ATTEMPTS) {
      console.log(
        `[publish ${position}/${total}] transient failure for ${packageSpec}; ` +
          "retrying after a short delay...",
      );

      await runtime.sleep(PUBLISH_RETRY_DELAY_MS);

      continue;
    }

    const message =
      result === null
        ? `publish ${packageSpec} did not complete: ${
            failureMessage ?? "unknown error"
          }.`
        : `publish ${packageSpec} failed with exit code ${result.status}.`;

    throw new PublishError(message, {
      status: result?.status ?? 1,
      stdout: result?.stdout ?? "",
      stderr: result?.stderr ?? "",
      category,
    });
  }
}
