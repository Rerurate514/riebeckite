import path from "node:path";
import { loadRiebeckiteConfig } from "@riebeckite/honox";
import type { RiebeckiteApplication } from "./application_root";

export async function loadApplicationConfig(application: RiebeckiteApplication) {
  return await loadRiebeckiteConfig({
    workspaceRoot: application.applicationRoot,
    configFile: path.relative(application.applicationRoot, application.configPath),
  });
}
