import {
  resolveHonoxApplicationRoot,
  startHonoxDevServer,
} from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root";
import { loadProjectConfig } from "../load_config";

export async function runDev(project: RiebeckiteProject): Promise<void> {
  await loadProjectConfig(project);
  const hostRoot = await resolveHonoxApplicationRoot(project.configRoot);
  await startHonoxDevServer({ root: hostRoot });
}
