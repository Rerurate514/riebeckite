import fs from "node:fs/promises";
import path from "node:path";
import {
  type ResolvedHonoxApplication,
  resolveHonoxApplication,
} from "@riebeckite/honox";

const configFileNames = [
  "riebeckite.config.ts",
  "riebeckite.config.js",
  "riebeckite.config.mjs",
] as const;

export type RiebeckiteProject = {
  invocationCwd: string;
  projectRoot: string;
  configRoot: string;
  configPath: string;
  appRoot: string;
  contentRoot: string;
  config: ResolvedHonoxApplication["config"];
};

export async function resolveRiebeckiteProject(
  currentDirectory: string,
): Promise<RiebeckiteProject> {
  const invocationCwd = path.resolve(currentDirectory);
  const startDirectory = invocationCwd;
  const configPath = await findConfigPath(startDirectory);
  if (!configPath) {
    throw new ProjectRootError(
      `Could not find ${configFileNames.join(", ")} from ${startDirectory}.`,
    );
  }

  const configRoot = path.dirname(configPath);
  const application = await resolveHonoxApplication({
    configRoot,
    configFile: configPath,
  });
  return {
    invocationCwd,
    projectRoot: configRoot,
    configRoot,
    configPath,
    appRoot: application.appRoot,
    contentRoot: application.contentRoot,
    config: application.config,
  };
}

export class ProjectRootError extends Error {
  readonly hint: string;

  constructor(message: string) {
    super(message);
    this.name = "ProjectRootError";
    this.hint =
      "Run the CLI from the application directory that contains riebeckite.config.ts.";
  }
}

async function findConfigPath(
  startDirectory: string,
): Promise<string | undefined> {
  for (const directory of parentDirectories(startDirectory)) {
    for (const fileName of configFileNames) {
      const filePath = path.join(directory, fileName);
      if (await isFile(filePath)) return filePath;
    }
  }
  return undefined;
}

function* parentDirectories(startDirectory: string): Generator<string> {
  let directory = startDirectory;
  while (true) {
    yield directory;
    const parent = path.dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
