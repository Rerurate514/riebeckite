import type { RiebeckiteProject } from "../application_root.js";
import {
  collectApplicationInspection,
  collectBuildInspection,
  collectConfigInspection,
  collectContentInspection,
  collectGraphInspection,
  collectPluginInspections,
} from "../inspect/collectors.js";
import {
  renderApplicationInspection,
  renderBuildInspection,
  renderConfigInspection,
  renderContentInspection,
  renderGraphInspection,
  renderPluginInspections,
} from "../inspect/renderer.js";
import { loadProjectConfig } from "../load_config.js";

export type InspectTarget =
  | "config"
  | "plugins"
  | "content"
  | "graph"
  | "build";

export async function runInspect(
  project: RiebeckiteProject,
  options: { target?: InspectTarget; list: boolean },
): Promise<void> {
  if (!options.target) {
    console.log(
      renderApplicationInspection(await collectApplicationInspection(project)),
    );
    return;
  }

  if (options.target === "config") {
    console.log(renderConfigInspection(await collectConfigInspection(project)));
    return;
  }
  if (options.target === "plugins") {
    console.log(
      renderPluginInspections(await collectPluginInspections(project)),
    );
    return;
  }
  if (options.target === "content") {
    const config = await loadProjectConfig(project);
    console.log(
      renderContentInspection(await collectContentInspection(config, project), {
        list: options.list,
      }),
    );
    return;
  }
  if (options.target === "graph") {
    console.log(renderGraphInspection(await collectGraphInspection(project)));
    return;
  }

  const config = await loadProjectConfig(project);
  console.log(renderBuildInspection(await collectBuildInspection(config)));
}
