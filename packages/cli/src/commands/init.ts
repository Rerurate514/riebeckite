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
};

export async function runInit(options: InitOptions): Promise<void> {
  const targetDirectory = path.resolve(process.cwd(), options.directory);
  const result = await scaffoldRiebeckiteSite({
    targetDirectory,
    overwrite: options.force,
    preset: options.preset,
  });

  const relative = path.relative(process.cwd(), result.targetDirectory) || ".";
  console.log(`Created a ${options.preset} Riebeckite site in ${relative}`);
  console.log("");
  const editFile = result.files.includes("content/index.md")
    ? "content/index.md"
    : undefined;
  console.log(formatScaffoldNextSteps(relative, { editFile }));
}
