import path from "node:path";
import {
  formatScaffoldNextSteps,
  ScaffoldSiteError,
  scaffoldRiebeckiteSite,
} from "@riebeckite/honox";
import {
  type CreateRiebeckiteOptions,
  parseArguments,
  printPresets,
} from "./arguments.js";
import {
  interactiveAnswersToOptions,
  promptInteractiveAnswers,
} from "./interactive.js";

export type { CreateRiebeckiteOptions } from "./arguments.js";

export async function runCreateRiebeckite(
  arguments_: readonly string[],
): Promise<void> {
  let options: CreateRiebeckiteOptions;
  if (arguments_.length === 0) {
    const answers = await promptInteractiveAnswers();
    if (answers === null) {
      console.log("Operation cancelled.");
      return;
    }
    options = interactiveAnswersToOptions(answers);
  } else {
    try {
      options = parseArguments(arguments_);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
  }

  if (options.listPresets) {
    printPresets();
    return;
  }

  const targetDirectory = path.resolve(process.cwd(), options.directory);
  try {
    const result = await scaffoldRiebeckiteSite({
      targetDirectory,
      overwrite: options.force,
      preset: options.preset,
      githubActions: options.githubActions,
      contentRepository: options.contentRepository,
      siteRepository: options.siteRepository,
    });
    const relative =
      path.relative(process.cwd(), result.targetDirectory) || ".";
    console.log(`Created a ${options.preset} Riebeckite site in ${relative}`);
    console.log("");
    const externalContent = options.contentRepository !== undefined;
    const editFile =
      !externalContent && result.files.includes("content/index.md")
        ? "content/index.md"
        : undefined;
    console.log(
      formatScaffoldNextSteps(relative, { editFile, externalContent }),
    );
  } catch (error) {
    if (error instanceof ScaffoldSiteError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}
