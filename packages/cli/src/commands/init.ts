import path from "node:path";
import { scaffoldRiebeckiteSite } from "@riebeckite/honox";

export type InitOptions = {
  readonly directory: string;
  readonly force: boolean;
};

export async function runInit(options: InitOptions): Promise<void> {
  const targetDirectory = path.resolve(process.cwd(), options.directory);
  const result = await scaffoldRiebeckiteSite({
    targetDirectory,
    overwrite: options.force,
  });

  const relative = path.relative(process.cwd(), result.targetDirectory) || ".";
  console.log(`Created a Riebeckite site in ${relative}`);
  console.log("");
  console.log("Next steps:");
  if (relative !== ".") console.log(`  cd ${relative}`);
  console.log("  pnpm install");
  console.log("  pnpm exec riebeckite check");
  console.log("  pnpm exec riebeckite build");
}
