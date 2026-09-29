import path from "node:path";
import {
  type ScaffoldPresetName,
  scaffoldRiebeckiteSite,
} from "@riebeckite/honox";

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
  console.log("Next steps:");
  if (relative !== ".") console.log(`  cd ${relative}`);
  console.log("  npm install");
  console.log("  npx riebeckite check");
  console.log("  npx riebeckite build");
}
