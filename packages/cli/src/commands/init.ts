import path from "node:path";
import {
  formatScaffoldNextSteps,
  type ScaffoldDeployment,
  type ScaffoldPresetName,
  type ScaffoldUtilityName,
  scaffoldRiebeckiteSite,
} from "create-riebeckite/scaffold";

export type InitOptions = {
  readonly directory: string;
  readonly force: boolean;
  readonly preset: ScaffoldPresetName;
  readonly utilities: readonly ScaffoldUtilityName[];
  readonly deployment: ScaffoldDeployment;
};

export async function runInit(options: InitOptions): Promise<void> {
  const targetDirectory = path.resolve(process.cwd(), options.directory);
  const result = await scaffoldRiebeckiteSite({
    targetDirectory,
    overwrite: options.force,
    preset: options.preset,
    utilities: options.utilities,
    deployment: options.deployment,
  });

  const relative = path.relative(process.cwd(), result.targetDirectory) || ".";
  console.log(`Created a ${options.preset} Riebeckite site in ${relative}`);
  console.log("");
  const editFile = result.files.includes("content/index.md")
    ? "content/index.md"
    : undefined;
  const externalContent =
    options.deployment.type === "github-actions" &&
    options.deployment.content.type === "external";
  console.log(formatScaffoldNextSteps(relative, { editFile, externalContent }));
}
