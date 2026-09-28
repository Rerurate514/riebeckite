import {
  resolveHonoxApplicationRoot,
  startHonoxDevServer,
} from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";

export async function runDev(project: RiebeckiteProject): Promise<void> {
  await loadProjectConfig(project);
  const hostRoot = await resolveHonoxApplicationRoot(project.configRoot);
  await startHonoxDevServer({ root: hostRoot });
}
