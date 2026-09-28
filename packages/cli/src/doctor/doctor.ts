import type { RiebeckiteProject } from "../application_root";
import { checkBuildState } from "./checks/build_state";
import { checkConfiguration } from "./checks/configuration";
import { checkContent } from "./checks/content";
import { checkEnvironment, checkStateDirectory } from "./checks/environment";
import { checkPlugins } from "./checks/plugins";
import type { DoctorCheckResult } from "./types";

export async function runDoctor(
  project: RiebeckiteProject,
): Promise<readonly DoctorCheckResult[]> {
  const environment = await checkEnvironment(project);
  const configuration = await checkConfiguration(project);
  const plugins = checkPlugins(
    configuration.config,
    configuration.pluginResolutionError,
  );
  const [content, buildState] = await Promise.all([
    checkContent(project, configuration.config),
    checkBuildState(configuration.config),
  ]);
  const stateDirectory = buildState.statePath
    ? await checkStateDirectory(buildState.statePath)
    : {
        id: "state-directory",
        label: "State directory",
        status: "skipped" as const,
        message: "Skipped because configuration is unavailable.",
      };

  return [
    ...environment,
    configuration.result,
    plugins,
    content,
    buildState.result,
    stateDirectory,
  ];
}
