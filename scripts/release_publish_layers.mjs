import {
  PUBLISH_CONCURRENCY,
  PUBLISH_FAILURE,
  PublishError,
  ReleaseError,
} from "./release_core.mjs";
import { mapWithConcurrency } from "./release_process.mjs";
import {
  publishInteractive,
  publishPackage,
} from "./release_publish_single.mjs";
import {
  ensureAuthentication,
  findFirstPendingPackage,
  isPackageVersionPublished,
} from "./release_registry.mjs";

export async function retryAuthenticationFailures(
  failures,
  manifests,
  version,
  publishedPackages,
) {
  await ensureAuthentication();

  for (const failure of failures) {
    const { directory } = failure;
    const manifest = manifests.get(directory);
    const packageSpec = `${manifest.name}@${version}`;

    console.log(`\n[authentication required] ${packageSpec}`);

    console.log("The parallel publish requested additional authentication.");

    const alreadyPublished = await isPackageVersionPublished(
      manifest.name,
      version,
    );

    if (alreadyPublished) {
      console.log(
        `${packageSpec} is already published; skipping interactive retry.`,
      );

      publishedPackages.add(directory);

      continue;
    }

    await publishInteractive(
      directory,
      manifest,
      version,
      "Retrying this package with an interactive terminal.",
    );

    publishedPackages.add(directory);

    console.log("Authentication refreshed. Parallel publishing will resume.");
  }
}

export function failureCategory(error) {
  return error instanceof PublishError
    ? error.category
    : PUBLISH_FAILURE.UNKNOWN;
}

export async function publishPackages(
  layers,
  manifests,
  publishedPackages,
  dryRun,
  version,
) {
  console.log("\nPublish dependency layers:");

  for (let index = 0; index < layers.length; index += 1) {
    console.log(`  layer ${index + 1}:`);

    for (const directory of layers[index]) {
      const manifest = manifests.get(directory);

      const suffix = publishedPackages.has(directory)
        ? " (already published)"
        : "";

      console.log(`    - ${manifest.name}${suffix}`);
    }
  }

  if (!dryRun) {
    await ensureAuthentication();

    const firstPending = findFirstPendingPackage(layers, publishedPackages);

    if (firstPending) {
      const manifest = manifests.get(firstPending);

      await publishInteractive(
        firstPending,
        manifest,
        version,
        "Authenticating with the first pending package before parallel publishing.",
      );

      publishedPackages.add(firstPending);
    }
  }

  const pendingCount = layers
    .flat()
    .filter((directory) => dryRun || !publishedPackages.has(directory)).length;

  if (!dryRun && pendingCount === 0) {
    console.log("\nAll packages are already published.");

    return;
  }

  if (dryRun) {
    console.log(`\n[dry-run] would publish ${pendingCount} package(s).`);
  } else {
    console.log(
      `\nStarting remaining publishes with concurrency ${PUBLISH_CONCURRENCY}.`,
    );
  }

  let publishPosition = 0;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex];

    console.log(`\n[publish layer ${layerIndex + 1}/${layers.length}]`);

    const pending = [];

    for (const directory of layer) {
      const manifest = manifests.get(directory);

      if (!dryRun && publishedPackages.has(directory)) {
        console.log(`  skip ${manifest.name}@${version} (already published)`);

        continue;
      }

      publishPosition += 1;

      pending.push({
        directory,
        position: publishPosition,
      });
    }

    if (pending.length === 0) {
      console.log("  nothing to publish");

      continue;
    }

    const results = await mapWithConcurrency(
      pending,
      PUBLISH_CONCURRENCY,
      async ({ directory, position }) => {
        const manifest = manifests.get(directory);

        try {
          await publishPackage(
            directory,
            manifest,
            version,
            dryRun,
            position,
            pendingCount,
          );

          return {
            directory,
            error: null,
          };
        } catch (error) {
          return {
            directory,
            error,
          };
        }
      },
    );

    for (const { directory, error } of results) {
      if (error === null) {
        publishedPackages.add(directory);
      }
    }

    const authenticationFailures = results.filter(
      ({ error }) => failureCategory(error) === PUBLISH_FAILURE.AUTHENTICATION,
    );

    const otherFailures = results.filter(
      ({ error }) =>
        error !== null &&
        failureCategory(error) !== PUBLISH_FAILURE.AUTHENTICATION,
    );

    if (authenticationFailures.length > 0 && !dryRun) {
      console.log(
        `\n${authenticationFailures.length} package(s) require interactive authentication.`,
      );

      await retryAuthenticationFailures(
        authenticationFailures,
        manifests,
        version,
        publishedPackages,
      );
    }

    if (otherFailures.length > 0) {
      console.error(`\nPublish layer ${layerIndex + 1} failed:`);

      for (const { directory, error } of otherFailures) {
        const manifest = manifests.get(directory);
        const category = failureCategory(error);

        console.error(
          `  - ${manifest.name}@${version} [${category}] ${error.message}`,
        );

        if (category === PUBLISH_FAILURE.PERMISSION) {
          console.error(
            "    This is a permission error, not a missing sign-in. Check " +
              "organization membership, package access, and the account " +
              "two-factor policy before retrying.",
          );
        }

        if (category === PUBLISH_FAILURE.NOT_FOUND) {
          console.error(
            "    The registry reported this package spec as not found. " +
              "Verify the package name and that it can be created.",
          );
        }

        if (category === PUBLISH_FAILURE.VERSION_CONFLICT) {
          console.error(
            "    The registry rejected this version as a conflict. Confirm its " +
              "state before choosing a new version or retrying.",
          );
        }

        if (category === PUBLISH_FAILURE.UNKNOWN) {
          console.error(
            "    The registry state is unknown. Check it with " +
              `npm view ${manifest.name}@${version} version before retrying.`,
          );
        }
      }

      const firstError = otherFailures[0].error;

      throw new ReleaseError(
        `${otherFailures.length} package(s) failed in publish layer ${
          layerIndex + 1
        }. Later layers were not started.`,
        firstError instanceof ReleaseError ? firstError.status : 1,
      );
    }

    console.log(`\n[publish layer ${layerIndex + 1}] complete`);
  }
}
