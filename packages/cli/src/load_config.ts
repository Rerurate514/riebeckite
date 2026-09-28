import path from "node:path";
import {
  loadRiebeckiteConfig,
  resolveHonoxApplicationRoot,
  resolveHonoxConfig,
} from "@riebeckite/honox";
import type { RiebeckiteProject } from "./application_root";

export async function loadProjectConfig(project: RiebeckiteProject) {
  const [config, appRoot] = await Promise.all([
    loadRiebeckiteConfig({
      workspaceRoot: project.configRoot,
      configFile: path.relative(project.configRoot, project.configPath),
    }),
    resolveHonoxApplicationRoot(project.configRoot),
  ]);
  return resolveHonoxConfig(config, appRoot);
}
