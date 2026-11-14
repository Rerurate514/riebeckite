import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";
import { isNotFoundOutput, isTransientOutput } from "./release_classify.mjs";
import {
  NPM_VIEW_CONCURRENCY,
  NPM_VIEW_TIMEOUT_MS,
  PACKAGE_STATE,
  PUBLISH_TIMEOUT_MS,
  REGISTRY_QUERY_ATTEMPTS,
  REGISTRY_QUERY_DELAY_MS,
  ReleaseError,
  repositoryRoot,
} from "./release_core.mjs";
import {
  combineOutput,
  mapWithConcurrency,
  runtime,
} from "./release_process.mjs";

export async function ensureAuthentication() {
  const currentUser = await runtime.spawnBuffered(
    "npm",
    ["whoami"],
    repositoryRoot,
    {
      timeout: NPM_VIEW_TIMEOUT_MS,
      label: "npm whoami",
    },
  );

  if (currentUser.status === 0) {
    const name = currentUser.stdout.trim();

    console.log(
      `\n[authentication] npm is signed in${name ? ` as ${name}` : ""}.`,
    );

    return;
  }

  console.log("\n[authentication] npm is not signed in for publishing.");

  console.log("Starting npm login; finish the browser or terminal prompt.");

  const login = await runtime.spawnInteractive(
    "npm",
    ["login"],
    repositoryRoot,
    {
      timeout: PUBLISH_TIMEOUT_MS,
      label: "npm login",
    },
  );

  if (login.status !== 0) {
    throw new ReleaseError(
      `npm login failed with exit code ${login.status}.`,
      login.status,
    );
  }

  const verifiedUser = await runtime.spawnBuffered(
    "npm",
    ["whoami"],
    repositoryRoot,
    {
      timeout: NPM_VIEW_TIMEOUT_MS,
      label: "npm whoami",
    },
  );

  if (verifiedUser.status !== 0) {
    throw new ReleaseError(
      "npm is still not signed in after npm login; aborting before publish.\n" +
        verifiedUser.stderr.trim(),
      verifiedUser.status,
    );
  }

  console.log(`\n[authentication] signed in as ${verifiedUser.stdout.trim()}.`);
}

export async function queryPublishedState(packageName, version) {
  const packageSpec = `${packageName}@${version}`;

  for (let attempt = 1; attempt <= REGISTRY_QUERY_ATTEMPTS; attempt += 1) {
    let result;

    try {
      result = await runtime.spawnBuffered(
        "npm",
        ["view", packageSpec, "version", "--json"],
        repositoryRoot,
        {
          timeout: NPM_VIEW_TIMEOUT_MS,
          label: `npm view ${packageSpec}`,
        },
      );
    } catch (error) {
      if (attempt < REGISTRY_QUERY_ATTEMPTS) {
        await runtime.sleep(REGISTRY_QUERY_DELAY_MS);

        continue;
      }

      return {
        state: PACKAGE_STATE.UNKNOWN,
        reason: error.message,
      };
    }

    if (result.status === 0) {
      let publishedVersion;

      try {
        publishedVersion = JSON.parse(result.stdout);
      } catch {
        return {
          state: PACKAGE_STATE.UNKNOWN,
          reason: "npm view returned invalid JSON.",
        };
      }

      if (
        publishedVersion === version ||
        (Array.isArray(publishedVersion) && publishedVersion.includes(version))
      ) {
        return {
          state: PACKAGE_STATE.PUBLISHED,
          reason: null,
        };
      }

      return {
        state: PACKAGE_STATE.UNKNOWN,
        reason: `npm view returned ${JSON.stringify(publishedVersion)}.`,
      };
    }

    const output = combineOutput(result.stdout, result.stderr);

    if (isNotFoundOutput(output)) {
      return {
        state: PACKAGE_STATE.UNPUBLISHED,
        reason: null,
      };
    }

    if (isTransientOutput(output) && attempt < REGISTRY_QUERY_ATTEMPTS) {
      await runtime.sleep(REGISTRY_QUERY_DELAY_MS);

      continue;
    }

    return {
      state: PACKAGE_STATE.UNKNOWN,
      reason: result.stderr.trim() || output.trim(),
    };
  }

  return {
    state: PACKAGE_STATE.UNKNOWN,
    reason: "registry state could not be established.",
  };
}

export async function isPackageVersionPublished(packageName, version) {
  const { state, reason } = await queryPublishedState(packageName, version);

  if (state === PACKAGE_STATE.PUBLISHED) {
    return true;
  }

  if (state === PACKAGE_STATE.UNPUBLISHED) {
    return false;
  }

  throw new ReleaseError(
    `Could not determine whether ${packageName}@${version} is published: ${
      reason ?? "unknown registry error"
    }`,
  );
}

export async function inspectPublishedPackages(
  manifests,
  version,
  dryRun,
  quiet,
) {
  if (dryRun) {
    return new Set();
  }

  if (!quiet) {
    console.log(
      "\n[step] checking published versions " +
        `(concurrency ${NPM_VIEW_CONCURRENCY})`,
    );
  }

  const checks = await mapWithConcurrency(
    PACKAGE_DIRECTORIES,
    NPM_VIEW_CONCURRENCY,
    async (directory) => {
      const manifest = manifests.get(directory);

      const published = await isPackageVersionPublished(manifest.name, version);

      if (!quiet) {
        console.log(
          `  ${
            published ? "published  " : "unpublished"
          } ${manifest.name}@${version}`,
        );
      }

      return {
        directory,
        published,
      };
    },
  );

  return new Set(
    checks
      .filter(({ published }) => published)
      .map(({ directory }) => directory),
  );
}

export function findFirstPendingPackage(layers, publishedPackages) {
  for (const layer of layers) {
    for (const directory of layer) {
      if (!publishedPackages.has(directory)) {
        return directory;
      }
    }
  }

  return null;
}
