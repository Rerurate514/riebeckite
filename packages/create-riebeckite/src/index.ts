import path from "node:path";
import {
  type CreateRiebeckiteOptions,
  parseArguments,
  printPresets,
} from "./arguments.js";
import {
  interactiveAnswersToOptions,
  promptDeployNow,
  promptInteractiveAnswers,
} from "./interactive.js";
import { packageManagerCommands } from "./package-manager.js";
import {
  buildAndDeploy,
  DeploymentFailure,
  formatCloudflareNextSteps,
  formatDeploymentFailure,
  installDependencies,
} from "./publish.js";
import { spawnCommand } from "./run-commands.js";
import {
  formatScaffoldNextSteps,
  ScaffoldSiteError,
  type ScaffoldSiteResult,
  scaffoldRiebeckiteSite,
} from "./scaffold/index.js";

export type { CreateRiebeckiteOptions } from "./arguments.js";

type ResolvedOptions = {
  readonly options: CreateRiebeckiteOptions;
  readonly interactive: boolean;
};

export async function runCreateRiebeckite(
  arguments_: readonly string[],
): Promise<void> {
  const resolved = await resolveOptions(arguments_);
  if (resolved === null) return;
  const { options, interactive } = resolved;

  if (options.listPresets) {
    printPresets();
    return;
  }

  const targetDirectory = path.resolve(process.cwd(), options.directory);
  let result: ScaffoldSiteResult;
  try {
    result = await scaffoldRiebeckiteSite({
      targetDirectory,
      overwrite: options.force,
      preset: options.preset,
      deployment: options.deployment,
    });
  } catch (error) {
    if (error instanceof ScaffoldSiteError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const relative = path.relative(process.cwd(), result.targetDirectory) || ".";
  console.log(`Created a ${options.preset} Riebeckite site in ${relative}`);
  console.log("");

  if (interactive && options.deployment.type === "cloudflare-workers") {
    await publishCloudflareSite(targetDirectory, relative);
    return;
  }

  printScaffoldNextSteps(options, result, relative);
}

async function resolveOptions(
  arguments_: readonly string[],
): Promise<ResolvedOptions | null> {
  if (arguments_.length === 0) {
    const answers = await promptInteractiveAnswers();
    if (answers === null) {
      console.log("Operation cancelled.");
      return null;
    }
    return { options: interactiveAnswersToOptions(answers), interactive: true };
  }

  try {
    return { options: parseArguments(arguments_), interactive: false };
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return null;
  }
}

function printScaffoldNextSteps(
  options: CreateRiebeckiteOptions,
  result: ScaffoldSiteResult,
  relative: string,
): void {
  const externalContent = isExternalContent(options.deployment);
  const editFile =
    !externalContent && result.files.includes("content/index.md")
      ? "content/index.md"
      : undefined;
  console.log(formatScaffoldNextSteps(relative, { editFile, externalContent }));
}

function isExternalContent(
  deployment: CreateRiebeckiteOptions["deployment"],
): boolean {
  return (
    deployment.type === "github-actions" &&
    deployment.content.type === "external"
  );
}

async function publishCloudflareSite(
  targetDirectory: string,
  relative: string,
): Promise<void> {
  const commands = packageManagerCommands();

  console.log(`Installing dependencies with ${commands.name}...`);
  try {
    await installDependencies(targetDirectory, commands, spawnCommand);
  } catch (error) {
    if (!(error instanceof DeploymentFailure)) throw error;
    reportDeploymentFailure(error, relative);
    return;
  }

  const deployNow = await promptDeployNow();
  if (!deployNow) {
    console.log("");
    console.log(formatCloudflareNextSteps(relative, commands));
    return;
  }

  try {
    await buildAndDeploy(targetDirectory, commands, spawnCommand);
  } catch (error) {
    if (!(error instanceof DeploymentFailure)) throw error;
    reportDeploymentFailure(error, relative);
    return;
  }

  console.log("");
  console.log("Deployment complete.");
}

function reportDeploymentFailure(
  error: DeploymentFailure,
  relative: string,
): void {
  const commands = packageManagerCommands();
  console.error("");
  console.error(formatDeploymentFailure(relative, commands, error));
  process.exitCode = 1;
}
