import type { RiebeckiteApplication } from "../application_root";
import { loadApplicationConfig } from "../load_config";

export async function runCheck(application: RiebeckiteApplication): Promise<void> {
  await loadApplicationConfig(application);
}
