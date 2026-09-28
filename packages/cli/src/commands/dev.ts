import { startHonoxDevServer } from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";

export async function runDev(project: RiebeckiteProject): Promise<void> {
  await loadProjectConfig(project);
  await startHonoxDevServer({ root: project.appRoot });
}
