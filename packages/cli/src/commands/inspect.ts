import type { RiebeckiteApplication } from "../application_root";
import {
  collectApplicationInspection,
  collectBuildInspection,
  collectConfigInspection,
  collectContentInspection,
  collectGraphInspection,
  collectPluginInspections,
} from "../inspect/collectors";
import {
  renderApplicationInspection,
  renderBuildInspection,
  renderConfigInspection,
  renderContentInspection,
  renderGraphInspection,
  renderPluginInspections,
} from "../inspect/renderer";
import { loadApplicationConfig } from "../load_config";

export type InspectTarget =
  | "config"
  | "plugins"
  | "content"
  | "graph"
  | "build";

export async function runInspect(
  application: RiebeckiteApplication,
  options: { target?: InspectTarget; list: boolean },
): Promise<void> {
  if (!options.target) {
    console.log(
      renderApplicationInspection(
        await collectApplicationInspection(application),
      ),
    );
    return;
  }

  if (options.target === "config") {
    console.log(
      renderConfigInspection(await collectConfigInspection(application)),
    );
    return;
  }
  if (options.target === "plugins") {
    console.log(
      renderPluginInspections(await collectPluginInspections(application)),
    );
    return;
  }
  if (options.target === "content") {
    const config = await loadApplicationConfig(application);
    console.log(
      renderContentInspection(
        await collectContentInspection(config, application),
        {
          list: options.list,
        },
      ),
    );
    return;
  }
  if (options.target === "graph") {
    console.log(
      renderGraphInspection(await collectGraphInspection(application)),
    );
    return;
  }

  const config = await loadApplicationConfig(application);
  console.log(renderBuildInspection(await collectBuildInspection(config)));
}
