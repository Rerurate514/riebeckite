import path from "node:path";
import {
  formatScaffoldNextSteps,
  type ScaffoldPresetName,
  scaffoldRiebeckiteSite,
} from "create-riebeckite/scaffold";

export type InitOptions = {
  readonly directory: string;
  readonly force: boolean;
  readonly preset: ScaffoldPresetName;
  readonly githubActions: boolean;
  readonly cloudflareWorkers: boolean;
  readonly contentRepository?: string;
  readonly siteRepository?: string;
};

export async function runInit(options: InitOptions): Promise<void> {
  const targetDirectory = path.resolve(process.cwd(), options.directory);
  const result = await scaffoldRiebeckiteSite({
    targetDirectory,
    overwrite: options.force,
    preset: options.preset,
    githubActions: options.githubActions,
    cloudflareWorkers: options.cloudflareWorkers,
    contentRepository: options.contentRepository,
    siteRepository: options.siteRepository,
  });

  const relative = path.relative(process.cwd(), result.targetDirectory) || ".";
  console.log(`Created a ${options.preset} Riebeckite site in ${relative}`);
  console.log("");
  const editFile = result.files.includes("content/index.md")
    ? "content/index.md"
    : undefined;
  console.log(
    formatScaffoldNextSteps(relative, {
      editFile,
      externalContent: options.contentRepository !== undefined,
    }),
  );
}
