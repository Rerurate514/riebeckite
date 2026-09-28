import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";

export async function runCheck(project: RiebeckiteProject): Promise<void> {
  await loadProjectConfig(project);
}
