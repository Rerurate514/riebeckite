import type { RiebeckiteProject } from "../application_root.js";
import { checkBuildState } from "./checks/build_state.js";
import { checkConfiguration } from "./checks/configuration.js";
import { checkContent } from "./checks/content.js";
import { checkEnvironment, checkStateDirectory } from "./checks/environment.js";
import { checkGitHub } from "./checks/github.js";
import { checkPlugins } from "./checks/plugins.js";
import type { DoctorCheckResult } from "./types.js";

export async function runDoctor(
  project: RiebeckiteProject,
  options: { readonly github?: boolean } = {},
): Promise<readonly DoctorCheckResult[]> {
  const environment = await checkEnvironment(project);
  const configuration = await checkConfiguration(project);
  const plugins = checkPlugins(
    configuration.config,
    configuration.pluginResolutionError,
  );
  const [content, buildState] = await Promise.all([
    checkContent(project, configuration.config),
    checkBuildState(project, configuration.config),
  ]);
  const stateDirectory = buildState.statePath
    ? await checkStateDirectory(buildState.statePath)
    : {
        id: "state-directory",
        label: "State directory",
        status: "skipped" as const,
        message: "Skipped because configuration is unavailable.",
      };

  const github = options.github ? await checkGitHub(project) : [];
  return [
    ...environment,
    configuration.result,
    plugins,
    content,
    buildState.result,
    stateDirectory,
    ...github,
  ];
}
