import type { RiebeckiteProject } from "../application_root.js";
import {
  collectApiInspection,
  collectApplicationInspection,
  collectAssetInspection,
  collectBuildInspection,
  collectConfigInspection,
  collectContentInspection,
  collectGraphInspection,
  collectPluginInspections,
  collectProvenanceInspection,
} from "../inspect/collectors.js";
import {
  renderApiInspection,
  renderApplicationInspection,
  renderAssetInspection,
  renderBuildInspection,
  renderConfigInspection,
  renderContentEntryInspection,
  renderContentInspection,
  renderGraphInspection,
  renderPluginInspections,
  renderProvenanceInspection,
} from "../inspect/renderer.js";
import { loadProjectConfig } from "../load_config.js";

export type InspectTarget =
  | "config"
  | "plugins"
  | "content"
  | "graph"
  | "build"
  | "assets"
  | "provenance"
  | "api";

export async function runInspect(
  project: RiebeckiteProject,
  options: {
    target?: InspectTarget;
    list: boolean;
    path?: string;
    json: boolean;
    source?: string;
    output?: string;
    compare?: string;
    deprecatedOnly?: boolean;
  },
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
    const inspection = await collectContentInspection(config, project);
    if (options.path) {
      const entry = inspection.paths.find(
        (candidate) =>
          candidate.path === options.path ||
          candidate.permalink === options.path,
      );
      if (!entry) throw new Error(`Content entry not found: ${options.path}`);
      console.log(renderContentEntryInspection(entry));
      return;
    }
    console.log(renderContentInspection(inspection, { list: options.list }));
    return;
  }
  if (options.target === "graph") {
    console.log(renderGraphInspection(await collectGraphInspection(project)));
    return;
  }
  if (options.target === "assets") {
    const inspection = await collectAssetInspection(project);
    console.log(
      options.json
        ? JSON.stringify(inspection, undefined, 2)
        : renderAssetInspection(inspection, { list: options.list }),
    );
    return;
  }
  if (options.target === "api") {
    const inspection = await collectApiInspection(project);
    console.log(
      options.json
        ? JSON.stringify(inspection, undefined, 2)
        : renderApiInspection(inspection, {
            deprecatedOnly: options.deprecatedOnly ?? false,
          }),
    );
    return;
  }
  if (options.target === "provenance") {
    const inspection = await collectProvenanceInspection(project, options);
    console.log(
      options.json
        ? JSON.stringify(inspection, undefined, 2)
        : renderProvenanceInspection(inspection),
    );
    return;
  }

  const config = await loadProjectConfig(project);
  console.log(renderBuildInspection(await collectBuildInspection(config)));
}
