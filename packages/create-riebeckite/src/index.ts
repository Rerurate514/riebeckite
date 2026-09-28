import path from "node:path";
import { ScaffoldSiteError, scaffoldRiebeckiteSite } from "@riebeckite/honox";

export type CreateRiebeckiteOptions = {
  readonly directory: string;
  readonly force: boolean;
};

export async function runCreateRiebeckite(
  arguments_: readonly string[],
): Promise<void> {
  let options: CreateRiebeckiteOptions;
  try {
    options = parseArguments(arguments_);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const targetDirectory = path.resolve(process.cwd(), options.directory);
  try {
    const result = await scaffoldRiebeckiteSite({
      targetDirectory,
      overwrite: options.force,
    });
    const relative =
      path.relative(process.cwd(), result.targetDirectory) || ".";
    console.log(`Created a Riebeckite site in ${relative}`);
    console.log("");
    console.log("Next steps:");
    if (relative !== ".") console.log(`  cd ${relative}`);
    console.log("  npm install");
    console.log("  npx riebeckite check");
    console.log("  npx riebeckite build");
  } catch (error) {
    if (error instanceof ScaffoldSiteError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

function parseArguments(
  arguments_: readonly string[],
): CreateRiebeckiteOptions {
  let directory: string | undefined;
  let force = false;

  for (const argument of arguments_) {
    if (argument === "--force") {
      force = true;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (directory !== undefined) {
      throw new Error("Usage: create-riebeckite [directory] [--force]");
    }
    directory = argument;
  }

  return { directory: directory ?? ".", force };
}
