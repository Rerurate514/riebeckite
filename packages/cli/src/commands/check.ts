import type { RiebeckiteProject } from "../application_root";
import { loadProjectConfig } from "../load_config";

export async function runCheck(project: RiebeckiteProject): Promise<void> {
  await loadProjectConfig(project);
}
